import pino from 'pino'
import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'

const logger = pino({ name: 'v1-03-parties', level: 'info' })

const authTokenProvider = new AuthTokenProvider(
    {
        method: 'self_signed',
        issuer: 'unsafe-auth',
        credentials: {
            clientId: 'ledger-api-user',
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        },
    },
    logger
)

const { userId } = await authTokenProvider.getAuthContext()

const sdk = await Sdk.create({
    authTokenProvider,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
})

const allocatedParties = await Promise.all(
    ['alice', 'bob'].map((partyHint) => {
        const partyKeys = sdk.keys.generate()
        return sdk.party.external
            .create(partyKeys.publicKey, {
                partyHint,
            })
            .sign(partyKeys.privateKey)
            .execute()
    })
)

logger.info(allocatedParties, 'Allocated parties')

const listedParties = await sdk.party.list()

logger.info(listedParties, `Obtained parties for ${userId}`)

const allocatedPartiesIds = new Set(
    allocatedParties.map((party) => party.partyId)
)

if (!allocatedPartiesIds.isSubsetOf(new Set(listedParties))) {
    throw new Error(
        "At least some of the allocated parties haven't been listed."
    )
}

const featuredAppRights = await sdk.amulet.featuredApp.grant()

if (!featuredAppRights) {
    throw new Error(
        'Failed to obtain featured app rights for validator operator party'
    )
} else {
    logger.info(
        featuredAppRights,
        'Featured app rights for validator operator party'
    )
}

logger.info('Preparing multi hosted party...')

const participantEndpoints = [
    {
        url: new URL('http://127.0.0.1:3975'),
        accessTokenProvider: authTokenProvider,
    },
]

const charlieKeys = sdk.keys.generate()
const charlie = await sdk.party.external
    .create(charlieKeys.publicKey, {
        partyHint: 'charlie',
        confirmingParticipantEndpoints: participantEndpoints,
    })
    .sign(charlieKeys.privateKey)
    .execute()

logger.info(charlie, 'Multi hosted party allocated successfully')

const charliePingCommand = sdk.utils.ping.create([
    { initiator: charlie.partyId, responder: charlie.partyId },
])

const pingResult = await sdk.ledger
    .prepare({
        partyId: charlie.partyId,
        commands: charliePingCommand,
    })
    .sign(charlieKeys.privateKey)
    .execute({
        partyId: charlie.partyId,
    })

logger.info(
    pingResult,
    'Successfully validated party allocation via Canton.Internal.Ping'
)

logger.info('Preparing multi hosted party with observing participant...')

const observingCharlieKeys = sdk.keys.generate()
const observingCharlie = await sdk.party.external
    .create(observingCharlieKeys.publicKey, {
        partyHint: 'observingCharlie',
        observingParticipantEndpoints: participantEndpoints,
    })
    .sign(observingCharlieKeys.privateKey)
    .execute()

logger.info(
    observingCharlie,
    'Multi hosted party with observing participant allocated successfully'
)

const observingConradPingCommand = sdk.utils.ping.create([
    {
        initiator: observingCharlie.partyId,
        responder: observingCharlie.partyId,
    },
])

const observingPingResult = await sdk.ledger
    .prepare({
        partyId: observingCharlie.partyId,
        commands: observingConradPingCommand,
    })
    .sign(observingCharlieKeys.privateKey)
    .execute({
        partyId: observingCharlie.partyId,
    })

logger.info(
    observingPingResult,
    'Successfully validated observing party allocation via Canton.Internal.Ping'
)
