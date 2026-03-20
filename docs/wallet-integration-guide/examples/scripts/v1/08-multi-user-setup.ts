import { localNetStaticConfig, Sdk } from '@canton-network/wallet-sdk'
import { pino } from 'pino'
import { TokenProviderConfig } from '@canton-network/wallet-sdk'
import { TOKEN_PROVIDER_CONFIG_DEFAULT } from './utils/index.js'
const logger = pino({ name: 'v1-multi-user-setup', level: 'info' })

logger.info('Operator sets up users and primary parties')

const operatorSdk = await Sdk.create({
    auth: TOKEN_PROVIDER_CONFIG_DEFAULT,
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
})

const aliceInternal = await operatorSdk.party.internal.allocate({
    partyHint: 'alice',
})

const bobInternal = await operatorSdk.party.internal.allocate({
    partyHint: 'bob',
})

const masterPartyInternal = await operatorSdk.party.internal.allocate({
    partyHint: 'masterParty',
})

logger.info('Created the internal parties')

const aliceUser = await operatorSdk.user.create({
    userId: 'alice-user',
    primaryParty: aliceInternal,
    userRights: {
        participantAdmin: true,
    },
})

const bobUser = await operatorSdk.user.create({
    userId: 'bob-user',
    primaryParty: bobInternal,
    userRights: {
        participantAdmin: true,
    },
})

const masterUser = await operatorSdk.user.create({
    userId: 'master-user',
    primaryParty: masterPartyInternal,
    userRights: {
        participantAdmin: true,
    },
})

logger.info('created the users')

if (!(aliceUser || bobUser || masterUser)) {
    throw new Error(`One of the users was not created correctly`)
}

await operatorSdk.user.rights.grant({
    userId: masterUser.id!,
    userRights: {
        canExecuteAsAnyParty: true,
        canReadAsAnyParty: true,
    },
})

logger.info(
    `Created alice user: ${aliceUser.id} with primary party (internal) ${aliceUser.primaryParty}`
)
logger.info(
    `Created bob user: ${bobUser.id} with primary party (internal) ${bobUser.primaryParty}`
)
logger.info(
    `Created master user: ${masterUser.id} with primary party (internal) ${masterUser.primaryParty}, with read as and execute as rights`
)

const aliceSdk = await Sdk.create({
    auth: {
        method: 'self_signed',
        issuer: 'unsafe-auth',
        credentials: {
            clientId: aliceUser.id,
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        },
    },
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
})

const aliceKeyPair = aliceSdk.keys.generate()
const aliceExternal = await aliceSdk.party.external
    .create(aliceKeyPair.publicKey, {
        partyHint: 'alice',
    })
    .sign(aliceKeyPair.privateKey)
    .execute()

logger.info(`alice created external party`)

const bobSdk = await Sdk.create({
    auth: {
        method: 'self_signed',
        issuer: 'unsafe-auth',
        credentials: {
            clientId: bobUser.id,
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        },
    },
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
})

const bobKeyPair = bobSdk.keys.generate()
const bobExternal = await bobSdk.party.external
    .create(bobKeyPair.publicKey, {
        partyHint: 'alice',
    })
    .sign(bobKeyPair.privateKey)
    .execute()
logger.info(`bob created external party`)

const masterUserSdk = await Sdk.create({
    auth: {
        method: 'self_signed',
        issuer: 'unsafe-auth',
        credentials: {
            clientId: masterUser.id,
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        },
    },
    ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
    validatorUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    tokenStandardUrl: localNetStaticConfig.LOCALNET_TOKEN_STANDARD_URL,
    scanApiBaseUrl: localNetStaticConfig.LOCALNET_SCAN_PROXY_API_URL,
    registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
})

const masterWalletView = await masterUserSdk.party.list()

if (!masterWalletView?.find((p) => p === aliceExternal.partyId)) {
    throw new Error('master user cannot see alice party')
}
if (!masterWalletView?.find((p) => p === bobExternal.partyId)) {
    throw new Error('master user cannot see bob party')
}

const aliceWalletView = await aliceSdk.party.list()

if (aliceWalletView?.find((p) => p === bobExternal.partyId)) {
    throw new Error('alice user can see bob party')
}

const bobWalletView = await bobSdk.party.list()

if (bobWalletView?.find((p) => p === aliceExternal.partyId)) {
    throw new Error('bob user can see alice party')
}

logger.info(
    'alice and bob have proper isolation and cannot see each others external parties'
)

//user management test
await bobSdk.user.rights.grant({
    userRights: {
        readAs: [aliceExternal.partyId],
    },
})

const bobWalletViewAfterGrantRights = await bobSdk.party.list()

if (!bobWalletViewAfterGrantRights?.find((p) => p === aliceExternal.partyId)) {
    throw new Error('bob user cannot see alice party even with ReadAs rights')
}
