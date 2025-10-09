import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localValidatorDefault,
    localNetStaticConfig,
    Enums_ParticipantPermission,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'

const logger = pino({ name: '06-external-party-setup', level: 'info' })

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
await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

const adminToken = await sdk.auth.getAdminToken()

const alice = await sdk.topology?.prepareSignAndSubmitExternalParty(
    singleHostedPartyKeyPair.privateKey,
    'alice'
)
logger.info(alice?.partyId!, 'created single hosted party to get synchronzerId')
await sdk.setPartyId(alice?.partyId!)

const multiHostedParticipantEndpointConfig = [
    {
        adminApiUrl: '127.0.0.1:2902',
        baseUrl: new URL('http://127.0.0.1:2975'),
        accessToken: adminToken.accessToken,
    },
    {
        adminApiUrl: '127.0.0.1:3902',
        baseUrl: new URL('http://127.0.0.1:3975'),
        accessToken: adminToken.accessToken,
    },
]

logger.info('multi host party starting...')

// const participantIdPromises = multiHostedParticipantEndpointConfig.map(
//     async (endpoint) => {
//         return await sdk.topology?.getParticipantId(endpoint)
//     }
// )

// const participantIds = await Promise.all(participantIdPromises)

// const participantPermissionMap = new Map<string, Enums_ParticipantPermission>()

// participantIds.map((pId) =>
//     participantPermissionMap.set(pId!, Enums_ParticipantPermission.CONFIRMATION)
// )

// await sdk.topology?.prepareSignAndSubmitMultiHostExternalParty(
//     multiHostedParticipantEndpointConfig,
//     multiHostedParty.privateKey,
//     sdk.userLedger!.getSynchronizerId(),
//     participantPermissionMap,
//     'bob'
// )

logger.info('multi hosted party succeeded!')
