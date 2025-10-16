import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    signTransactionHash,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { v4 } from 'uuid'
import { pino } from 'pino'

const logger = pino({ name: '02-auth-localnet', level: 'info' })

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger: logger,
    authFactory: localNetAuthDefault,
    ledgerFactory: localNetLedgerDefault,
    topologyFactory: localNetTopologyDefault,
    tokenStandardFactory: localNetTokenStandardDefault,
})

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

await sdk.userLedger
    ?.listWallets()
    .then((wallets) => {
        logger.info(wallets, 'Wallets')
    })
    .catch((error) => {
        logger.error(error, 'Error listing wallets')
    })

await sdk.connectAdmin()
logger.info('Connected to admin ledger')

await sdk.adminLedger
    ?.listWallets()
    .then((wallets) => {
        logger.info(wallets, 'Wallets')
    })
    .catch((error) => {
        logger.error(error, 'Error listing wallets')
    })

await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
logger.info('Connected to topology')

const keyPair = createKeyPair()

logger.info('generated keypair')

const generatedParty = await sdk.userLedger?.generateExternalParty(
    keyPair.publicKey
)

if (!generatedParty) {
    throw new Error('Error creating prepared party')
}

const { multiHash, partyId } = generatedParty

logger.info('Prepared external topology')

logger.info('Signing the hash')
const signedHash = signTransactionHash(multiHash, keyPair.privateKey)

const allocatedParty = await sdk.userLedger?.allocateExternalParty(
    signedHash,
    generatedParty
)

logger.info({ partyId: allocatedParty!.partyId }, 'Allocated party')
await sdk.setPartyId(allocatedParty!.partyId!)

logger.info({ partyId: partyId }, 'Create ping command for party')

const createPingCommand = sdk.userLedger?.createPingCommand(partyId)

logger.info('Prepare command submission for ping create command')
const prepareResponse =
    await sdk.userLedger?.prepareSubmission(createPingCommand)

logger.info('Sign transaction hash')

const signedCommandHash = signTransactionHash(
    prepareResponse!.preparedTransactionHash!,
    keyPair.privateKey
)

logger.info('Submit command')

const response = await sdk.userLedger?.executeSubmissionAndWaitFor(
    prepareResponse!,
    signedCommandHash,
    keyPair.publicKey,
    v4()
)

logger.info(response, 'Executed command submission succeeded')
