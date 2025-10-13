import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localValidatorDefault,
    localNetStaticConfig,
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

const alice = await sdk.userLedger?.signAndAllocateExternalParty(
    singleHostedPartyKeyPair.privateKey,
    'alice'
)
logger.info(alice?.partyId!, 'created single hosted party to get synchronzerId')
await sdk.setPartyId(alice?.partyId!)

const multiHostedParticipantEndpointConfig = [
    {
        url: new URL('http://127.0.0.1:3975'),
        accessToken: adminToken.accessToken,
    },
]

logger.info('multi host party starting...')

await sdk.userLedger?.signAndAllocateExternalParty(
    multiHostedParty.privateKey,
    'bob',
    1,
    multiHostedParticipantEndpointConfig
)

logger.info('multi hosted party succeeded!')
