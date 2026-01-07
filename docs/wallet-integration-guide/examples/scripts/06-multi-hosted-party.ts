import {
    WalletSDKImpl,
    localNetAuthDefault,
    localNetLedgerDefault,
    localNetTopologyDefault,
    localNetTokenStandardDefault,
    createKeyPair,
    localValidatorDefault,
    localNetStaticConfig,
    UpdatesResponse,
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
const multiHostedKeyPairWithObserverParticipant = createKeyPair()

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

const multiHostedPartyWithObservingParticipant =
    await sdk.userLedger?.signAndAllocateExternalParty(
        multiHostedKeyPairWithObserverParticipant.privateKey,
        'jon',
        1,
        [],
        [
            {
                url: new URL('http://127.0.0.1:3975'),
                accessTokenProvider: authTokenProvider,
            },
        ]
    )
logger.info(
    multiHostedPartyWithObservingParticipant,
    'created party with an observing participant'
)

await sdk.setPartyId(multiHostedPartyWithObservingParticipant?.partyId!)

const events: UpdatesResponse[] = []
const controller = new AbortController()

const subscribeToPingUpdates = (async () => {
    try {
        const stream = sdk.userLedger?.subscribeToUpdates(
            [],
            ['#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping']
        )
        for await (const update of stream!) {
            events.push(update as UpdatesResponse)
            if (controller.signal.aborted) break
        }
    } catch (err) {
        if (!controller.signal.aborted) throw err
    }
})()

subscribeToPingUpdates

const createPingCommand2 = sdk.userLedger?.createPingCommand(
    multiHostedPartyWithObservingParticipant!.partyId!
)

const pingCommandResponse2 = await sdk.userLedger?.prepareSignExecuteAndWaitFor(
    createPingCommand2,
    multiHostedKeyPairWithObserverParticipant.privateKey,
    v4()
)
logger.info(pingCommandResponse2, 'ping command response')

logger.info(events)

logger.info(events.length)

controller.abort()

process.exit(0)
