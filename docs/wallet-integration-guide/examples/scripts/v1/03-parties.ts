import pino from 'pino'
import {
    localNetAuthDefault,
    localNetStaticConfig,
    Sdk,
    AuthTokenProvider,
} from '@canton-network/wallet-sdk'

const logger = pino({ name: 'v1-parties', level: 'info' })

const localNetAuth = localNetAuthDefault(logger)
const authTokenProvider = new AuthTokenProvider(localNetAuth)

const isAdmin = true
const userId = isAdmin
    ? (await authTokenProvider.getAdminAuthContext()).userId
    : (await authTokenProvider.getUserAuthContext()).userId

const sdk = await Sdk.create({
    authTokenProvider,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    isAdmin,
})

const allocatedParties = await Promise.all(
    ['alice', 'bob', 'conrad'].map((partyHint) => {
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
