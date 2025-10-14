import { v4 } from 'uuid'
import {
    localAuthDefault,
    localLedgerDefault,
    localTopologyDefault,
    WalletSDKImpl,
    createKeyPair,
    localTokenStandardDefault,
    TopologyController,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import path from 'path'
import { fileURLToPath } from 'url'

const logger = pino({ name: '01-auth', level: 'info' })

const here = path.dirname(fileURLToPath(import.meta.url))
const PATH_TO_TLS_DIR = '../../../../canton/tls'

const tlsTopologyController = (
    userId: string,
    userAdminToken: string
): TopologyController => {
    return new TopologyController(
        '127.0.0.1:5012',
        new URL('http://127.0.0.1:5003'),
        userId,
        userAdminToken,
        'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd',
        {
            useTls: true,
            tls: {
                rootCert: path.join(here, PATH_TO_TLS_DIR, 'ca.crt'),
                mutual: false,
            },
        }
    )
}

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localAuthDefault,
    ledgerFactory: localLedgerDefault,
    topologyFactory: tlsTopologyController,
    tokenStandardFactory: localTokenStandardDefault,
})
const fixedLocalNetSynchronizer =
    'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd'

logger.info('SDK initialized')

await sdk.connect()
logger.info('Connected to ledger')

await sdk.userLedger
    ?.listWallets()
    .then((wallets) => {
        logger.info('Wallets:', wallets)
    })
    .catch((error) => {
        console.error('Error listing wallets:', error)
    })

await sdk.connectAdmin()
logger.info('Connected to admin ledger')

await sdk.adminLedger
    ?.listWallets()
    .then((wallets) => {
        logger.info('Wallets:', wallets)
    })
    .catch((error) => {
        console.error('Error listing wallets:', error)
    })

await sdk.connectTopology(fixedLocalNetSynchronizer)
logger.info('Connected to topology')

const keyPair = createKeyPair()

const alice = await sdk.topology?.prepareSignAndSubmitExternalParty(
    keyPair.privateKey,
    'alice'
)

logger.info(`Created party: ${alice!.partyId}`)

// await sdk.setPartyId(alice!.partyId)

// logger.info('SDK initialized')

// await sdk.connect()
// logger.info('Connected to ledger')

// const keyPairTreasury = createKeyPair()
// const receiverPartyKeyPair = createKeyPair()

// await sdk.connectAdmin()
// await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)
// sdk.tokenStandard?.setTransferFactoryRegistryUrl(
//     localNetStaticConfig.LOCALNET_REGISTRY_API_URL
// )

// logger.info('generated keypair')
// const generatedParty = await sdk.adminLedger?.generateExternalParty(
//     keyPair.publicKey
// )

// if (!generatedParty) {
//     throw new Error('Error generating external party topology')
// }

// logger.info('Prepared external topology')
// logger.info('Signing the hash')

// const { partyId, multiHash } = generatedParty

// const signedHash = signTransactionHash(multiHash, keyPair.privateKey)

// await sdk.adminLedger
//     ?.allocateExternalParty(signedHash, generatedParty)
//     .then((allocatedParty) => {
//         logger.info('Alocated party ', allocatedParty.partyId)
//     })
//     .catch((e) => logger.info(e))

// logger.info('Create ping command')
// const createPingCommand = await sdk.userLedger?.createPingCommand(partyId)

// sdk.setPartyId(partyId)

// logger.info('Prepare command submission for ping create command')
// const prepareResponse =
//     await sdk.adminLedger?.prepareSubmission(createPingCommand)

// logger.info('Sign transaction hash')

// const signedCommandHash = signTransactionHash(
//     prepareResponse!.preparedTransactionHash!,
//     keyPair.privateKey
// )

// logger.info('Submit command')

// sdk.adminLedger
//     ?.executeSubmission(
//         prepareResponse!,
//         signedCommandHash,
//         keyPair.publicKey,
//         v4()
//     )
//     .then((executeSubmissionResponse) => {
//         logger.info(
//             'Executed command submission succeeded',
//             executeSubmissionResponse
//         )
//     })
//     .catch((error) =>
//         console.error('Failed to submit command with error %d', error)
//     )
