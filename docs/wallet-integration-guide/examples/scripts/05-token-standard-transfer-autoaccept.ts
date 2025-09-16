import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localValidatorDefault,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { LOCALNET_REGISTRY_API_URL, LOCALNET_SCAN_API_URL } from '../config.js'
import { v4 } from 'uuid'

const logger = pino({ name: '05-external-party-setup', level: 'info' })

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
    validatorFactory: localValidatorDefault,
})

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

const keyPairSender = createKeyPair()
const keyPairReceiver = createKeyPair()

await sdk.connectAdmin()
await sdk.connectTopology(LOCALNET_SCAN_API_URL)

const sender = await sdk.topology?.prepareSignAndSubmitExternalParty(
    keyPairSender.privateKey,
    'alice'
)
logger.info(`Created party: ${sender!.partyId}`)
await sdk.setPartyId(sender!.partyId)

const receiver = await sdk.topology?.prepareSignAndSubmitExternalParty(
    keyPairReceiver.privateKey,
    'bob'
)
logger.info(`Created party: ${receiver!.partyId}`)

const synchronizers = await sdk.userLedger?.listSynchronizers()

const synchonizerId = synchronizers!.connectedSynchronizers![0].synchronizerId

await sdk.userLedger
    ?.listWallets()
    .then((wallets) => {
        logger.info(wallets, 'Wallets:')
    })
    .catch((error) => {
        logger.error({ error }, 'Error listing wallets')
    })

sdk.tokenStandard?.setSynchronizerId(synchonizerId)

sdk.tokenStandard?.setTransferFactoryRegistryUrl(LOCALNET_REGISTRY_API_URL)
await new Promise((res) => setTimeout(res, 5000))

await sdk.setPartyId(receiver?.partyId!)
const validatorOperatorParty = await sdk.validator?.getValidatorUser()

sdk.tokenStandard?.setTransferFactoryRegistryUrl(LOCALNET_REGISTRY_API_URL)

const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

await new Promise((res) => setTimeout(res, 5000))

logger.info('creating transfer preapproval proposal')

const transferPreApprovalProposal =
    await sdk.userLedger?.createTransferPreapprovalCommand(
        validatorOperatorParty!, // TODO: find out how to get this not through validator api
        receiver?.partyId!,
        instrumentAdminPartyId
    )

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [transferPreApprovalProposal],
    keyPairReceiver.privateKey,
    v4()
)

logger.info('transfer pre approval proposal is created')

await sdk.setPartyId(sender?.partyId!)

const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    sender!.partyId,
    '20000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [{ ExerciseCommand: tapCommand }],
    keyPairSender.privateKey,
    v4(),
    disclosedContracts
)

await new Promise((res) => setTimeout(res, 5000))

const utxos = await sdk.tokenStandard?.listHoldingUtxos()
logger.info(utxos, 'List Token Standard Holding UTXOs')

await sdk.tokenStandard
    ?.listHoldingTransactions()
    .then((transactions) => {
        logger.info(transactions, 'Token Standard Holding Transactions:')
    })
    .catch((error) => {
        logger.error(
            { error },
            'Error listing token standard holding transactions:'
        )
    })

logger.info('Creating transfer transaction')

const [transferCommand, disclosedContracts2] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        'memo-ref'
    )

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    [{ ExerciseCommand: transferCommand }],
    keyPairSender.privateKey,
    v4(),
    disclosedContracts2
)
logger.info('Submitted transfer transaction')

await new Promise((res) => setTimeout(res, 5000))

{
    await sdk.setPartyId(sender!.partyId)
    const aliceHoldings = await sdk.tokenStandard?.listHoldingTransactions()
    logger.info(aliceHoldings, '[ALICE] holding transactions')

    await sdk.setPartyId(receiver!.partyId)
    const bobHoldings = await sdk.tokenStandard?.listHoldingTransactions()
    logger.info(bobHoldings, '[BOB] holding transactions')
}
