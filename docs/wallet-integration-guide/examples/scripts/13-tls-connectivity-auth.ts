import { v4 } from 'uuid'
import {
    localAuthDefault,
    localLedgerDefault,
    localTopologyDefault,
    WalletSDKImpl,
    createKeyPair,
    localTokenStandardDefault,
    localTopologyTlsEnabled,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'

const logger = pino({ name: '12-integration-extensions', level: 'info' })

// it is important to configure the SDK correctly else you might run into connectivity or authentication issues
const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localAuthDefault,
    ledgerFactory: localLedgerDefault,
    topologyFactory: localTopologyTlsEnabled,
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
