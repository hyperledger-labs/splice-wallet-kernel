import {
    WalletSDKImpl,
    createKeyPair,
    localNetAuthDefault,
    localNetLedgerAppProvider,
    localNetLedgerAppUser,
    localNetTokenStandardDefault,
    localNetTopologyAppProvider,
    localNetTopologyAppUser,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { LOCALNET_VALIDATOR_APP_PROVIDER_URL } from '../config.js'

const logger = pino({ name: '07-one-step-deposit', level: 'info' })

const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerAppProvider,
    topologyFactory: localNetTopologyAppProvider,
    tokenStandardFactory: localNetTokenStandardDefault,
})

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

// Exchange party setup

await sdk.connectAdmin()
const exchangeSuffix = Math.floor(Math.random() * 10000)
const exchangeParty = (
    await sdk.adminLedger!.allocateInternalParty(`exchangeId_${exchangeSuffix}`)
).partyDetails!.party

logger.info(`Created exchange party: ${exchangeParty}`)

await sdk.connectTopology(LOCALNET_VALIDATOR_APP_PROVIDER_URL)
const treasuryKeyPair = createKeyPair()
const treasuryParty = (
    await sdk.topology?.prepareSignAndSubmitExternalParty(
        treasuryKeyPair.privateKey,
        'treasury'
    )
)?.partyId!

logger.info(`Created treasury party: ${treasuryParty}`)

// More init stuff
// NOTE: let's get rid of the need for this setup!
sdk.userLedger?.setPartyId(treasuryParty)
const synchronizers = await sdk.userLedger?.listSynchronizers()
const synchronizerId = synchronizers!.connectedSynchronizers![0].synchronizerId
sdk.userLedger?.setSynchronizerId(synchronizerId)

// preapproval
const cmd = await sdk.userLedger?.createTransferPreapprovalCommand(
    exchangeParty,
    treasuryParty
)

logger.info(`Preapproval command created ${JSON.stringify(cmd)}`)
await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [cmd],
    treasuryKeyPair.privateKey,
    v4(),
    []
)

logger.info(`Created transfer preapproval for : ${treasuryParty}`)

// featured app right
// setup customer
const customerSdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerAppUser,
    topologyFactory: localNetTopologyAppUser,
    tokenStandardFactory: localNetTokenStandardDefault,
})

const customerKeyPair = createKeyPair()
const customerParty = (
    await sdk.topology?.prepareSignAndSubmitExternalParty(
        customerKeyPair.privateKey,
        'customer'
    )
)?.partyId!
customerSdk.setPartyId(customerParty)
logger.info(`Created customer party: ${customerParty}`)

const instrumentAdminPartyId =
    (await customerSdk.tokenStandard?.getInstrumentAdmin()) || ''
const [tapCommand, disclosedContracts] =
    await customerSdk.tokenStandard!.createTap(customerParty, '2000000', {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    })

logger.info(`Tapped for customer: ${customerParty}`)

// await sdk.customerLedger?.prepareSignAndExecuteTransaction(
//     [{ ExerciseCommand: tapCommand }],
//     keyPairSender.privateKey,
//     v4(),
//     disclosedContracts
// )

// tap for customer
// transfer to exchange
// exchange observes the deposit via tx log
