import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
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
    tokenStandardFactory: localNetTokenStandardDefault,
})

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

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

logger.info('Signing the hash')
const signedHash = signTransactionHash(
    generatedParty.multiHash,
    keyPair.privateKey
)

const allocatedParty = await sdk.userLedger?.allocateExternalParty(
    signedHash,
    generatedParty
)

logger.info({ partyId: allocatedParty!.partyId }, 'Allocated party')
await sdk.setPartyId(allocatedParty!.partyId!)

logger.info(allocatedParty, 'Create ping command for party')

const createPingCommand = sdk.userLedger?.createPingCommand(
    allocatedParty!.partyId!
)

logger.info('Prepare command submission for ping create command')
const prepareResponse =
    await sdk.userLedger?.prepareSubmission(createPingCommand)

logger.info('Sign transaction hash')

const signedCommandHash = signTransactionHash(
    prepareResponse!.preparedTransactionHash!,
    keyPair.privateKey
)

logger.info('Submit command')

const signatures = [
    {
        partyId: allocatedParty!.partyId!,
        signature: signedCommandHash,
        publicKey: keyPair.publicKey,
    },
]

const response = await sdk.userLedger?.executeSubmissionAndWaitFor(
    prepareResponse!,
    signatures,
    v4()
)

logger.info(response, 'Executed command submission succeeded')
