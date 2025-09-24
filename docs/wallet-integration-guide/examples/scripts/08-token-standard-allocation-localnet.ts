import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'
import { LOCALNET_REGISTRY_API_URL, LOCALNET_VALIDATOR_URL } from '../config.js'

const logger = pino({
    name: '08-token-standard-allocation-localnet',
    level: 'info',
})

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
await sdk.connectTopology(LOCALNET_VALIDATOR_URL)

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

await sdk.userLedger
    ?.listWallets()
    .then((wallets) => {
        logger.info(wallets, 'Wallets:')
    })
    .catch((error) => {
        logger.error({ error }, 'Error listing wallets')
    })

sdk.tokenStandard?.setTransferFactoryRegistryUrl(LOCALNET_REGISTRY_API_URL)
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

await sdk.userLedger?.prepareSignAndExecuteTransaction(
    tapCommand,
    keyPairSender.privateKey,
    v4(),
    disclosedContracts
)

await new Promise((res) => setTimeout(res, 5000))

const utxos = await sdk.tokenStandard?.listHoldingUtxos(false)
logger.info(utxos, 'List Available Token Standard Holding UTXOs')

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

logger.info('Creating allocation instruction')

const [allocateCmd, allocateDisclosed] =
    await sdk.tokenStandard!.createAllocationInstruction(
        sender!.partyId,
        receiver!.partyId,
        '100',
        { instrumentId: 'Amulet', instrumentAdmin: instrumentAdminPartyId },
        sender!.partyId,
        utxos?.map((u) => u.contractId),
        'demo-allocation',
        {},
        {},
        new Date(Date.now() + 5 * 60_000),
        new Date(Date.now() + 30 * 60_000),
        'leg-1',
        'demo-settlement'
    )

const offsetAlloc = (await sdk.userLedger?.ledgerEnd())?.offset ?? 0
const allocateCommandId =
    await sdk.userLedger?.prepareSignAndExecuteTransaction(
        allocateCmd,
        keyPairSender.privateKey,
        v4(),
        allocateDisclosed
    )
logger.info('Submitted allocation instruction')

await sdk.userLedger?.waitForCompletion(offsetAlloc, 5000, allocateCommandId!)
logger.info('Allocation instruction transaction completed')

const pendingAllocationInstructionsSender =
    await sdk.tokenStandard?.fetchPendingAllocationInstructionView()

const pendingAllocationsSender =
    await sdk.tokenStandard?.fetchPendingAllocationView()

logger.info(
    { pendingAllocationInstructionsSender, pendingAllocationsSender },
    'Pending AllocationInstructions (Alice)'
)

await sdk.setPartyId(receiver!.partyId)
const pendingAllocationInstructionsReceiver =
    await sdk.tokenStandard?.fetchPendingAllocationInstructionView()

const pendingAllocationsReceiver =
    await sdk.tokenStandard?.fetchPendingAllocationView()

logger.info(
    { pendingAllocationInstructionsReceiver, pendingAllocationsReceiver },
    'Pending AllocationInstructions (Bob)'
)
