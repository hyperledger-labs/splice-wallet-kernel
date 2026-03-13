import pino from 'pino'
import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'

const logger = pino({ name: 'v1-parties', level: 'info' })

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

const conradKeys = sdk.keys.generate()
const conrad = await sdk.party.external
    .create(conradKeys.publicKey, {
        partyHint: 'conrad',
        confirmingParticipantEndpoints: participantEndpoints,
    })
    .sign(conradKeys.privateKey)
    .execute()

logger.info(conrad, 'Multi hosted party allocated successfully')

const conradPingCommand = sdk.ping.create([
    { initiator: conrad.partyId, responder: conrad.partyId },
])

const pingResult = await (
    await sdk.ledger.prepare({
        partyId: conrad.partyId,
        commands: conradPingCommand,
    })
)
    .sign(conradKeys.privateKey)
    .execute({
        partyId: conrad.partyId,
    })

logger.info(
    pingResult,
    'Successfully validated party allocation via Canton.Internal.Ping'
)

logger.info('Preparing multi hosted party with observing participant...')

const observingConradKeys = sdk.keys.generate()
const observingConrad = await sdk.party.external
    .create(observingConradKeys.publicKey, {
        partyHint: 'observingConrad',
        observingParticipantEndpoints: participantEndpoints,
    })
    .sign(observingConradKeys.privateKey)
    .execute()

logger.info(
    observingConrad,
    'Multi hosted party with observing participant allocated successfully'
)

const observingConradPingCommand = sdk.ping.create([
    { initiator: observingConrad.partyId, responder: observingConrad.partyId },
])

const observingPingResult = await (
    await sdk.ledger.prepare({
        partyId: observingConrad.partyId,
        commands: observingConradPingCommand,
    })
)
    .sign(observingConradKeys.privateKey)
    .execute({
        partyId: observingConrad.partyId,
    })

logger.info(
    observingPingResult,
    'Successfully validated observing party allocation via Canton.Internal.Ping'
)
