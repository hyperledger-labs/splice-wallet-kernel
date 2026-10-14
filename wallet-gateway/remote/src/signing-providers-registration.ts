// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import BlockdaemonSigningProvider, {
    type CantonCaip2,
} from '@canton-network/core-signing-blockdaemon'
import BitGoSigningProvider from '@canton-network/core-signing-bitgo'
import DfnsSigningProvider from '@canton-network/core-signing-dfns'
import FireblocksSigningProvider from '@canton-network/core-signing-fireblocks'
import { InternalSigningDriver } from '@canton-network/core-signing-internal'
import { SigningProvider } from '@canton-network/core-signing-lib'
import { ParticipantSigningDriver } from '@canton-network/core-signing-participant'
import SecurosysSigningProvider, {
    type TsbSignatureAlgorithm,
} from '@canton-network/core-signing-securosys'
import type { StoreSql as SigningStoreSql } from '@canton-network/core-signing-store-sql'
import type { Logger } from 'pino'
import type { SigningDrivers } from '@canton-network/core-wallet-services'
import type { SigningProvidersConfig } from './config/Config.js'
import { Env } from './env.js'

const DEFAULT_FIREBLOCKS_API_PATH = 'https://api.fireblocks.io/v1'
const DEFAULT_BLOCKDAEMON_BASE_URL = 'http://localhost:5080/api/cwp/canton'
const DEFAULT_BLOCKDAEMON_CAIP2 = 'canton:testnet'
const DEFAULT_DFNS_BASE_URL = 'https://api.dfns.io'
const DEFAULT_SECUROSYS_SIGNATURE_ALGORITHM = 'EDDSA'
const DEFAULT_BITGO_BASE_URL = 'https://app.bitgo.com'

type ProviderSecrets = {
    fireblocksApiKey: string | undefined
    fireblocksApiSecret: string | undefined
    blockdaemonApiKey: string | undefined
    securosysKeyManagementApiKey: string | undefined
    securosysKeyOperationApiKey: string | undefined
    securosysBearerToken: string | undefined
    securosysMtlsP12Password: string | undefined
    securosysKeyPassword: string | undefined
    dfnsPrivateKey: string | undefined
    dfnsAuthToken: string | undefined
    bitgoAccessToken: string | undefined
}

type ProviderSettings = {
    fireblocksApiPath: string
    blockdaemonBaseUrl: string
    blockdaemonCaip2: string
    dfnsOrgId: string | undefined
    dfnsBaseUrl: string
    dfnsCredId: string | undefined
    securosysBaseUrl: string | undefined
    securosysMtlsP12Path: string | undefined
    securosysSignatureAlgorithm: string
    bitgoBaseUrl: string
    bitgoEnterpriseId: string | undefined
    bitgoCoin: string | undefined
}

type ProviderSelection = {
    participant: boolean
    walletKernel: boolean
    fireblocks: boolean
    blockdaemon: boolean
    securosys: boolean
    dfns: boolean
    bitgo: boolean
}

function providerUnavailableWarning(name: string) {
    return `${name} environment variables not fully set. ${name} signing provider will be unavailable.`
}

function readLegacySecrets(): ProviderSecrets {
    return {
        fireblocksApiKey: Env.get('FIREBLOCKS_API_KEY'),
        fireblocksApiSecret: Env.get('FIREBLOCKS_SECRET'),
        blockdaemonApiKey: Env.get('BLOCKDAEMON_API_KEY'),
        securosysKeyManagementApiKey: Env.get(
            'SECUROSYS_TSB_KEY_MANAGEMENT_API_KEY'
        ),
        securosysKeyOperationApiKey: Env.get(
            'SECUROSYS_TSB_KEY_OPERATION_API_KEY'
        ),
        securosysBearerToken: Env.get('SECUROSYS_TSB_BEARER_TOKEN'),
        securosysMtlsP12Password: Env.get('SECUROSYS_TSB_MTLS_P12_PASSWORD'),
        securosysKeyPassword: Env.get('SECUROSYS_TSB_KEY_PASSWORD'),
        dfnsPrivateKey: Env.get('DFNS_PRIVATE_KEY'),
        dfnsAuthToken: Env.get('DFNS_AUTH_TOKEN'),
        bitgoAccessToken: Env.get('BITGO_ACCESS_TOKEN'),
    }
}

function readExplicitSecrets(
    signingProviders: SigningProvidersConfig
): ProviderSecrets {
    return {
        fireblocksApiKey: Env.get(
            signingProviders.fireblocks?.apiKeyEnv ?? 'FIREBLOCKS_API_KEY'
        ),
        fireblocksApiSecret: Env.get(
            signingProviders.fireblocks?.secretEnv ?? 'FIREBLOCKS_SECRET'
        ),
        blockdaemonApiKey: Env.get(
            signingProviders.blockdaemon?.apiKeyEnv ?? 'BLOCKDAEMON_API_KEY'
        ),
        securosysKeyManagementApiKey: Env.get(
            signingProviders.securosys?.keyManagementApiKeyEnv ??
                'SECUROSYS_TSB_KEY_MANAGEMENT_API_KEY'
        ),
        securosysKeyOperationApiKey: Env.get(
            signingProviders.securosys?.keyOperationApiKeyEnv ??
                'SECUROSYS_TSB_KEY_OPERATION_API_KEY'
        ),
        securosysBearerToken: Env.get(
            signingProviders.securosys?.bearerTokenEnv ??
                'SECUROSYS_TSB_BEARER_TOKEN'
        ),
        securosysMtlsP12Password: Env.get(
            signingProviders.securosys?.mtlsP12PasswordEnv ??
                'SECUROSYS_TSB_MTLS_P12_PASSWORD'
        ),
        securosysKeyPassword: Env.get(
            signingProviders.securosys?.keyPasswordEnv ??
                'SECUROSYS_TSB_KEY_PASSWORD'
        ),
        dfnsPrivateKey: Env.get(
            signingProviders.dfns?.privateKeyEnv ?? 'DFNS_PRIVATE_KEY'
        ),
        dfnsAuthToken: Env.get(
            signingProviders.dfns?.authTokenEnv ?? 'DFNS_AUTH_TOKEN'
        ),
        bitgoAccessToken: Env.get(
            signingProviders.bitgo?.accessTokenEnv ?? 'BITGO_ACCESS_TOKEN'
        ),
    }
}

function legacySettings(): ProviderSettings {
    return {
        fireblocksApiPath:
            Env.get('FIREBLOCKS_API_PATH') ?? DEFAULT_FIREBLOCKS_API_PATH,
        blockdaemonBaseUrl:
            Env.get('BLOCKDAEMON_API_URL') ?? DEFAULT_BLOCKDAEMON_BASE_URL,
        blockdaemonCaip2:
            Env.get('BLOCKDAEMON_CAIP2') ?? DEFAULT_BLOCKDAEMON_CAIP2,
        dfnsOrgId: Env.get('DFNS_ORG_ID'),
        dfnsBaseUrl: Env.get('DFNS_BASE_URL') ?? DEFAULT_DFNS_BASE_URL,
        dfnsCredId: Env.get('DFNS_CRED_ID'),
        securosysBaseUrl: Env.get('SECUROSYS_TSB_BASE_URL'),
        securosysMtlsP12Path: Env.get('SECUROSYS_TSB_MTLS_P12_PATH'),
        securosysSignatureAlgorithm:
            Env.get('SECUROSYS_TSB_SIGNATURE_ALGORITHM') ??
            DEFAULT_SECUROSYS_SIGNATURE_ALGORITHM,
        bitgoBaseUrl: Env.get('BITGO_API_URL') ?? DEFAULT_BITGO_BASE_URL,
        bitgoEnterpriseId: Env.get('BITGO_ENTERPRISE_ID'),
        bitgoCoin: Env.get('BITGO_COIN'),
    }
}

function explicitSettings(
    signingProviders: SigningProvidersConfig
): ProviderSettings {
    return {
        fireblocksApiPath:
            signingProviders.fireblocks?.apiPath ?? DEFAULT_FIREBLOCKS_API_PATH,
        blockdaemonBaseUrl:
            signingProviders.blockdaemon?.baseUrl ??
            DEFAULT_BLOCKDAEMON_BASE_URL,
        blockdaemonCaip2:
            signingProviders.blockdaemon?.caip2 ?? DEFAULT_BLOCKDAEMON_CAIP2,
        dfnsOrgId: signingProviders.dfns?.orgId,
        dfnsBaseUrl: signingProviders.dfns?.baseUrl ?? DEFAULT_DFNS_BASE_URL,
        dfnsCredId: signingProviders.dfns?.credId,
        securosysBaseUrl: signingProviders.securosys?.baseUrl,
        securosysMtlsP12Path: signingProviders.securosys?.mtlsP12Path,
        securosysSignatureAlgorithm:
            signingProviders.securosys?.signatureAlgorithm ??
            DEFAULT_SECUROSYS_SIGNATURE_ALGORITHM,
        bitgoBaseUrl: signingProviders.bitgo?.baseUrl ?? DEFAULT_BITGO_BASE_URL,
        bitgoEnterpriseId: signingProviders.bitgo?.enterpriseId,
        bitgoCoin: signingProviders.bitgo?.coin,
    }
}

function buildDrivers(
    selected: ProviderSelection,
    settings: ProviderSettings,
    secrets: ProviderSecrets,
    signingStore: SigningStoreSql | undefined,
    logger: Logger
): SigningDrivers {
    const drivers: SigningDrivers = {}

    if (selected.participant) {
        drivers[SigningProvider.PARTICIPANT] = new ParticipantSigningDriver()
    }

    if (selected.walletKernel) {
        if (!signingStore) {
            logger.warn(
                'Wallet Kernel signing provider is unavailable because signingStore is not configured'
            )
        } else {
            drivers[SigningProvider.WALLET_KERNEL] = new InternalSigningDriver(
                signingStore
            )
        }
    }

    if (selected.fireblocks) {
        if (secrets.fireblocksApiKey && secrets.fireblocksApiSecret) {
            const keyInfo = {
                apiKey: secrets.fireblocksApiKey,
                apiSecret: secrets.fireblocksApiSecret,
            }
            drivers[SigningProvider.FIREBLOCKS] = new FireblocksSigningProvider(
                {
                    defaultKeyInfo: keyInfo,
                    userApiKeys: new Map([['user', keyInfo]]),
                    apiPath: settings.fireblocksApiPath,
                }
            )
        } else {
            logger.warn(providerUnavailableWarning('Fireblocks'))
        }
    }

    if (selected.blockdaemon) {
        if (secrets.blockdaemonApiKey) {
            drivers[SigningProvider.BLOCKDAEMON] =
                new BlockdaemonSigningProvider({
                    baseUrl: settings.blockdaemonBaseUrl,
                    apiKey: secrets.blockdaemonApiKey,
                    caip2: settings.blockdaemonCaip2 as CantonCaip2,
                })
        } else {
            logger.warn(providerUnavailableWarning('Blockdaemon'))
        }
    }

    if (selected.securosys) {
        if (settings.securosysBaseUrl) {
            drivers[SigningProvider.SECUROSYS] = new SecurosysSigningProvider({
                baseUrl: settings.securosysBaseUrl,
                ...(secrets.securosysKeyManagementApiKey && {
                    keyManagementApiKey: secrets.securosysKeyManagementApiKey,
                }),
                ...(secrets.securosysKeyOperationApiKey && {
                    keyOperationApiKey: secrets.securosysKeyOperationApiKey,
                }),
                ...(secrets.securosysBearerToken && {
                    bearerToken: secrets.securosysBearerToken,
                }),
                ...(settings.securosysMtlsP12Path && {
                    mtlsP12Path: settings.securosysMtlsP12Path,
                }),
                ...(secrets.securosysMtlsP12Password && {
                    mtlsP12Password: secrets.securosysMtlsP12Password,
                }),
                ...(secrets.securosysKeyPassword && {
                    keyPassword: secrets.securosysKeyPassword,
                }),
                signatureAlgorithm:
                    settings.securosysSignatureAlgorithm as TsbSignatureAlgorithm,
            })
        } else {
            logger.warn(providerUnavailableWarning('Securosys'))
        }
    }

    if (selected.dfns) {
        if (
            settings.dfnsOrgId &&
            settings.dfnsCredId &&
            secrets.dfnsPrivateKey &&
            secrets.dfnsAuthToken
        ) {
            drivers[SigningProvider.DFNS] = new DfnsSigningProvider({
                orgId: settings.dfnsOrgId,
                baseUrl: settings.dfnsBaseUrl,
                credentials: {
                    credId: settings.dfnsCredId,
                    privateKey: secrets.dfnsPrivateKey,
                    authToken: secrets.dfnsAuthToken,
                },
            })
        } else {
            logger.warn(providerUnavailableWarning('Dfns'))
        }
    }

    if (selected.bitgo) {
        if (secrets.bitgoAccessToken) {
            if (!settings.bitgoEnterpriseId) {
                logger.warn(
                    'BitGo enterprise ID is not set. Wallet creation will fail and restart-safe transaction lookup will be unavailable'
                )
            }
            drivers[SigningProvider.BITGO] = new BitGoSigningProvider({
                accessToken: secrets.bitgoAccessToken,
                baseUrl: settings.bitgoBaseUrl,
                enterpriseId: settings.bitgoEnterpriseId,
                coin: settings.bitgoCoin,
            })
        } else {
            logger.warn(providerUnavailableWarning('BitGo'))
        }
    }

    return drivers
}

export function registerSigningProviders(
    signingProviders: SigningProvidersConfig | undefined,
    signingStore: SigningStoreSql | undefined,
    logger: Logger
): SigningDrivers {
    const secrets =
        signingProviders === undefined
            ? readLegacySecrets()
            : readExplicitSecrets(signingProviders)

    if (signingProviders === undefined) {
        logger.info(
            'signingProviders is omitted, using legacy discovery from environment variables'
        )
        return buildDrivers(
            {
                participant: true,
                walletKernel: true,
                fireblocks: true,
                blockdaemon: true,
                securosys: true,
                dfns: true,
                bitgo: true,
            },
            legacySettings(),
            secrets,
            signingStore,
            logger
        )
    }

    return buildDrivers(
        {
            participant: signingProviders.participant !== undefined,
            walletKernel: signingProviders.walletKernel !== undefined,
            fireblocks: signingProviders.fireblocks !== undefined,
            blockdaemon: signingProviders.blockdaemon !== undefined,
            securosys: signingProviders.securosys !== undefined,
            dfns: signingProviders.dfns !== undefined,
            bitgo: signingProviders.bitgo !== undefined,
        },
        explicitSettings(signingProviders),
        secrets,
        signingStore,
        logger
    )
}
