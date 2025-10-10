import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'

const logger = pino({ name: '10-idempotent-and-error', level: 'info' })

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

const keyPairSender = createKeyPair()
const keyPairReceiver = createKeyPair()

await sdk.connectAdmin()
await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

const sender = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairSender.privateKey,
    'alice'
)
logger.info(`Created party: ${sender!.partyId}`)

logger.info(`checking idempotent behavior of onboarding`)
const sender2 = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairSender.privateKey,
    'alice'
)

if (sender?.partyId !== sender2?.partyId) {
    throw new Error('onboarding external party is not idempotent')
} else {
    logger.info('alice successfully onboarded twice (idempotent behavior)')
}

await sdk.setPartyId(sender!.partyId)

const receiver = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPairReceiver.privateKey,
    'bob'
)
logger.info(`Created party: ${receiver!.partyId}`)

sdk.tokenStandard?.setTransferFactoryRegistryUrl(
    localNetStaticConfig.LOCALNET_REGISTRY_API_URL
)
const instrumentAdminPartyId =
    (await sdk.tokenStandard?.getInstrumentAdmin()) || ''

const [tapCommand, disclosedContracts] = await sdk.tokenStandard!.createTap(
    sender!.partyId,
    '2000000',
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    }
)
let offsetLatest = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0

await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    tapCommand,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts
)

const utxos = await sdk.tokenStandard?.listHoldingUtxos(false)

const [firstSpendCommand, disclosedContracts2] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '100',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        utxos?.map((t) => t.contractId),
        'memo-ref'
    )

logger.info('creating double spend')
const [secondSpendCommand, disclosedContracts3] =
    await sdk.tokenStandard!.createTransfer(
        sender!.partyId,
        receiver!.partyId,
        '200',
        {
            instrumentId: 'Amulet',
            instrumentAdmin: instrumentAdminPartyId,
        },
        utxos?.map((t) => t.contractId),
        'memo-ref'
    )

offsetLatest = (await sdk.userLedger?.ledgerEnd())?.offset ?? offsetLatest

//one of these two commands will fail

const firstSpendCommandId = sdk.userLedger?.prepareSignAndExecuteTransaction(
    firstSpendCommand,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts2
)
const secondSpendCommandId = sdk.userLedger?.prepareSignAndExecuteTransaction(
    secondSpendCommand,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts3
)

logger.info('Created two transaction using same utxo (double spend)')

try {
    await sdk.userLedger?.waitForCompletion(
        offsetLatest,
        5000,
        await firstSpendCommandId
    )
    await sdk.userLedger?.waitForCompletion(
        offsetLatest,
        5000,
        await secondSpendCommandId
    )
} catch (e) {
    logger.info(
        e,
        'got double spend exception (LOCAL_VERDICT_LOCKED_CONTRACTS)'
    )
}
