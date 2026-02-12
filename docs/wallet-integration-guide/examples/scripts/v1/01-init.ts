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
    ledgerClientUrl: new URL('http://127.0.0.1:2975'),
    validatorUrl: new URL('http://wallet.localhost:2000/api/validator'),
    tokenStandardUrl: new URL('http://127.0.0.1:5003'),
    registries: [new URL(localNetStaticConfig.LOCALNET_REGISTRY_API_URL)],
})

sdk.keys.generate()
