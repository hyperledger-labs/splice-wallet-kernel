import {
    WalletSDKImpl,
    createKeyPair,
    localNetAuthDefault,
    localNetLedgerAppProvider,
    localNetLedgerAppUser,
    localNetTokenStandardAppUser,
    localNetTokenStandardAppProvider,
    localNetTopologyAppProvider,
    localNetTopologyAppUser,
    localValidatorDefault,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'

const logger = pino({ name: '08-one-step-deposit', level: 'info' })

const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerAppProvider,
    topologyFactory: localNetTopologyAppProvider,
    tokenStandardFactory: localNetTokenStandardAppProvider,
    validatorFactory: localValidatorDefault,
})

logger.info('SDK initialized')

await sdk.connect()
await sdk.connectAdmin()
await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

logger.info('Connected to ledger')

// Exchange party setup

const exchangeSuffix = Math.floor(Math.random() * 10000)
const exchangeParty = (
    await sdk.adminLedger!.allocateInternalParty(`exchangeId_${exchangeSuffix}`)
).partyDetails!.party

logger.info(`Created exchange party: ${exchangeParty}`)

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
await sdk.setPartyId(treasuryParty)

const validatorOperatorParty = await sdk.validator?.getValidatorUser()

const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''
// preapproval
const cmd = await sdk.userLedger?.createTransferPreapprovalCommand(
    validatorOperatorParty!,
    treasuryParty,
    instrumentAdminPartyId
)

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    cmd,
    treasuryKeyPair.privateKey,
    v4(),
    []
)

logger.info(`Created transfer preapproval for: ${treasuryParty}`)

// featured app right
// setup customer
const customerSdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerAppUser,
    topologyFactory: localNetTopologyAppUser,
    tokenStandardFactory: localNetTokenStandardAppUser,
})

logger.info(`Setting up customer SDK`)

await customerSdk.connect()
await customerSdk.connectAdmin()
await customerSdk.connectTopology(
    localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL
)
customerSdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)

const customerKeyPair = createKeyPair()
const customerPartyId = (
    await customerSdk.topology?.prepareSignAndSubmitExternalParty(
        customerKeyPair.privateKey,
        'customer'
    )
)?.partyId!

await customerSdk.setPartyId(customerPartyId)
logger.info(`Created customer party: ${customerPartyId}`)

const amuletIdentifier = {
    instrumentId: 'Amulet',
    instrumentAdmin: instrumentAdminPartyId,
}
const [tapCommand, tapDisclosedContracts] =
    await customerSdk.tokenStandard!.createTap(
        customerPartyId,
        '2000000',
        amuletIdentifier
    )

await customerSdk.userLedger?.prepareSignExecuteAndWaitFor(
    tapCommand,
    customerKeyPair.privateKey,
    v4(),
    tapDisclosedContracts
)

logger.info(`Tapped for customer: ${customerPartyId}`)

// transfer to exchange
const [customerTransferCommand, customerTransferDisclosedContracts] =
    await customerSdk.tokenStandard!.createTransfer(
        customerPartyId,
        treasuryParty,
        '100',
        amuletIdentifier,
        [],
        `deposit from ${customerPartyId}`
    )

await customerSdk.userLedger?.prepareSignExecuteAndWaitFor(
    customerTransferCommand,
    customerKeyPair.privateKey,
    v4(),
    customerTransferDisclosedContracts
)

logger.info(`transferred 100 from ${customerPartyId} to ${treasuryParty}`)

// we sleep for a few seconds to ensure the transaction is on both validators
await new Promise((resolve) => setTimeout(resolve, 5000))
// exchange observes the deposit via tx log
const exchangeHoldings = await sdk.tokenStandard?.listHoldingTransactions()

// Type guard for label with reason
function hasReason(label: any): label is { reason: string } {
    return label && typeof label.reason === 'string'
}

const hasMemoRef = exchangeHoldings!.transactions.some((tx) =>
    tx.events.some(
        (event) =>
            hasReason(event.label) &&
            event.label.reason === `deposit from ${customerPartyId}`
    )
)

if (hasMemoRef) {
    logger.info('Found a transaction with reason "memo-ref"')
} else {
    logger.info('No transaction with reason "memo-ref" found')
}
