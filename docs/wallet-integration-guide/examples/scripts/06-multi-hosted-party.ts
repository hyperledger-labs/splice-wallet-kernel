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

const multiHostedParty = createKeyPair()
const singleHostedPartyKeyPair = createKeyPair()

await sdk.connectAdmin()
await sdk.connectTopology(LOCALNET_SCAN_API_URL)

const adminToken = await sdk.auth.getAdminToken()

const alice = await sdk.topology?.prepareSignAndSubmitExternalParty(
    singleHostedPartyKeyPair.privateKey,
    'alice'
)
logger.info('created single hosted party to get synchronzerId')
sdk.userLedger?.setPartyId(alice?.partyId!)

const synchronizers = await sdk.userLedger?.listSynchronizers()

const synchonizerId = synchronizers!.connectedSynchronizers![0].synchronizerId

const participantEndpointConfigs = [
    {
        adminApiUrl: '127.0.0.1:3902',
        baseUrl: 'http://127.0.0.1:3975',
        accessToken: adminToken.accessToken,
    },
    // {
    //     adminApiUrl: '127.0.0.1:4902',
    //     baseUrl: 'http://127.0.0.1:4975',
    //     accessToken: adminToken.accessToken,
    // },
]

/*

        '127.0.0.1:2902',
        'http://127.0.0.1:2975',
        */
logger.info('multi host party starting...')
const result = await sdk.topology?.multiHostParty(
    participantEndpointConfigs,
    multiHostedParty.privateKey,
    synchonizerId,
    'bob'
)

logger.info('multi hosted party succeeded!')
