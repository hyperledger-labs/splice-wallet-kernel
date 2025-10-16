import {
    localAuthDefault,
    localLedgerDefault,
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
        logger.info({ wallets: wallets })
    })
    .catch((error) => {
        console.error('Error listing wallets:', error)
    })

await sdk.connectAdmin()
logger.info('Connected to admin ledger')

await sdk.adminLedger
    ?.listWallets()
    .then((wallets) => {
        logger.info({ wallets: wallets })
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
