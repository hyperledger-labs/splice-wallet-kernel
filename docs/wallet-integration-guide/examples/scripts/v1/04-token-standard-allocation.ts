import pino from 'pino'
import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs/promises'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'

const logger = pino({ name: 'v1-token-standard-allocation', level: 'info' })

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

const isAdmin = true

const sdk = await Sdk.create({
    authTokenProvider,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
    isAdmin,
})

// This example needs uploaded .dar for splice-token-test-trading-app
// It's in files of localnet, but it's not uploaded to participant, so we need to do this in the script
// Adjust if to your .localnet location
const PATH_TO_LOCALNET = '../../../../../.localnet'
const PATH_TO_DAR_IN_LOCALNET = '/dars/splice-token-test-trading-app-1.0.0.dar'
const TRADING_APP_PACKAGE_ID =
    'e5c9847d5a88d3b8d65436f01765fc5ba142cc58529692e2dacdd865d9939f71'

const here = path.dirname(fileURLToPath(import.meta.url))

const tradingDarPath = path.join(
    here,
    PATH_TO_LOCALNET,
    PATH_TO_DAR_IN_LOCALNET
)

try {
    const darBytes = await fs.readFile(tradingDarPath)
    await sdk.ledger.dar.upload(darBytes, TRADING_APP_PACKAGE_ID)
    logger.info(
        'Trading app DAR ensured on participant (uploaded or already present)'
    )
} catch (e) {
    logger.error(
        { e, tradingDarPath },
        'Failed to ensure trading app DAR uploaded'
    )
    throw e
}

//TODO: add token standard allocation example here
