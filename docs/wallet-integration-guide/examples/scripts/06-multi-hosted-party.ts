import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    localNetLedgerAppProvider,
    createKeyPair,
    localValidatorDefault,
    localNetStaticConfig,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { v4 } from 'uuid'

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

const multiHostedPartyKeyPair = createKeyPair()
const singleHostedPartyKeyPair = createKeyPair()

await sdk.connectAdmin()
await sdk.connectTopology(localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL)

const authTokenProvider = sdk.authTokenProvider

const alice = await sdk.userLedger?.signAndAllocateExternalParty(
    singleHostedPartyKeyPair.privateKey,
    'alice'
)
logger.info(
    { partyId: alice?.partyId! },
    'created single hosted party to get synchronzerId'
)
await sdk.setPartyId(alice?.partyId!)

const multiHostedParticipantEndpointConfig = [
    {
        url: new URL('http://127.0.0.1:3975'),
        accessTokenProvider: authTokenProvider,
    },
]

logger.info('multi host party starting...')

const multiHostedParty = await sdk.userLedger?.signAndAllocateExternalParty(
    multiHostedPartyKeyPair.privateKey,
    'bob',
    1,
    multiHostedParticipantEndpointConfig
)

logger.info(multiHostedParty, 'multi hosted party succeeded!')

await sdk.setPartyId(multiHostedParty?.partyId!)

logger.info('Create ping command')
const createPingCommand = sdk.userLedger?.createPingCommand(
    multiHostedParty!.partyId!
)

logger.info('Prepare command submission for ping create command')

const pingCommandResponse = await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    createPingCommand,
    multiHostedPartyKeyPair.privateKey,
    v4()
)
logger.info(pingCommandResponse, 'ping command response')
