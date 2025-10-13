import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    createKeyPair,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'
import { pino } from 'pino'

const logger = pino({ name: '03-ping-localnet', level: 'info' })

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger: logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
})

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

const wallets = await sdk.userLedger?.listWallets()

logger.info(wallets, 'user Wallets')

const keyPair = createKeyPair()
await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

logger.info('generated keypair')
const allocatedParty = await sdk.userLedger?.signAndAllocateExternalParty(
    keyPair.privateKey
)
await sdk.setPartyId(allocatedParty!.partyId)

logger.info('Create ping command')
const createPingCommand = sdk.userLedger?.createPingCommand(
    allocatedParty!.partyId!
)

logger.info('Prepare command submission for ping create command')
const prepareResponse = await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    createPingCommand,
    keyPair.privateKey,
    v4()
)
