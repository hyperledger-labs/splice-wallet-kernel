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

const isAdmin = false
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

const parties = await sdk.party.external.getParties()

logger.info(parties, `Obtained parties for ${userId}`)
