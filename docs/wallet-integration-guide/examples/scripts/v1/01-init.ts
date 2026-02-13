import {
    localNetAuthDefault,
    localNetStaticConfig,
    Sdk,
    AuthTokenProvider,
} from '@canton-network/wallet-sdk'
import { pino } from 'pino'

const logger = pino({ name: 'v1-initialization', level: 'info' })

const sdk = await Sdk.create({
    logger,
    authTokenProvider: new AuthTokenProvider(localNetAuthDefault(logger)),
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
})

const aliceKeys = sdk.keys.generate()

// TODO: pass synchronizerId as arg
const alice = await sdk.party.external
    .create(aliceKeys.publicKey, '', {
        partyHint: 'Alice in Wonderland',
    })
    .sign(aliceKeys.privateKey)
    // TODO: pass userid
    .execute('aliceUserId')

logger.info({ alice }, 'Alice party representation:')
