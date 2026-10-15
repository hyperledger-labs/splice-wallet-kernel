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
import {
    signingProvidersConfigSchema,
    type SigningProvidersConfig,
} from './config/Config.js'
import { Env } from './env.js'

const fireblocksSchema =
    signingProvidersConfigSchema.shape.fireblocks.unwrap().shape
const blockdaemonSchema =
    signingProvidersConfigSchema.shape.blockdaemon.unwrap().shape
const dfnsSchema = signingProvidersConfigSchema.shape.dfns.unwrap().shape
const securosysSchema =
    signingProvidersConfigSchema.shape.securosys.unwrap().shape
const bitgoSchema = signingProvidersConfigSchema.shape.bitgo.unwrap().shape

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
    blockdaemonCaip2: CantonCaip2
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
        fireblocksApiKey: Env.get(fireblocksSchema.apiKeyEnv.parse(undefined)),
        fireblocksApiSecret: Env.get(
            fireblocksSchema.secretEnv.parse(undefined)
        ),
        blockdaemonApiKey: Env.get(
            blockdaemonSchema.apiKeyEnv.parse(undefined)
        ),
        securosysKeyManagementApiKey: Env.get(
            securosysSchema.keyManagementApiKeyEnv.parse(undefined)
        ),
        securosysKeyOperationApiKey: Env.get(
            securosysSchema.keyOperationApiKeyEnv.parse(undefined)
        ),
        securosysBearerToken: Env.get(
            securosysSchema.bearerTokenEnv.parse(undefined)
        ),
        securosysMtlsP12Password: Env.get(
            securosysSchema.mtlsP12PasswordEnv.parse(undefined)
        ),
        securosysKeyPassword: Env.get(
            securosysSchema.keyPasswordEnv.parse(undefined)
        ),
        dfnsPrivateKey: Env.get(dfnsSchema.privateKeyEnv.parse(undefined)),
        dfnsAuthToken: Env.get(dfnsSchema.authTokenEnv.parse(undefined)),
        bitgoAccessToken: Env.get(bitgoSchema.accessTokenEnv.parse(undefined)),
    }
}

function readExplicitSecrets(
    signingProviders: SigningProvidersConfig
): ProviderSecrets {
    return {
        fireblocksApiKey: Env.get(
            fireblocksSchema.apiKeyEnv.parse(
                signingProviders.fireblocks?.apiKeyEnv
            )
        ),
        fireblocksApiSecret: Env.get(
            fireblocksSchema.secretEnv.parse(
                signingProviders.fireblocks?.secretEnv
            )
        ),
        blockdaemonApiKey: Env.get(
            blockdaemonSchema.apiKeyEnv.parse(
                signingProviders.blockdaemon?.apiKeyEnv
            )
        ),
        securosysKeyManagementApiKey: Env.get(
            securosysSchema.keyManagementApiKeyEnv.parse(
                signingProviders.securosys?.keyManagementApiKeyEnv
            )
        ),
        securosysKeyOperationApiKey: Env.get(
            securosysSchema.keyOperationApiKeyEnv.parse(
                signingProviders.securosys?.keyOperationApiKeyEnv
            )
        ),
        securosysBearerToken: Env.get(
            securosysSchema.bearerTokenEnv.parse(
                signingProviders.securosys?.bearerTokenEnv
            )
        ),
        securosysMtlsP12Password: Env.get(
            securosysSchema.mtlsP12PasswordEnv.parse(
                signingProviders.securosys?.mtlsP12PasswordEnv
            )
        ),
        securosysKeyPassword: Env.get(
            securosysSchema.keyPasswordEnv.parse(
                signingProviders.securosys?.keyPasswordEnv
            )
        ),
        dfnsPrivateKey: Env.get(
            dfnsSchema.privateKeyEnv.parse(signingProviders.dfns?.privateKeyEnv)
        ),
        dfnsAuthToken: Env.get(
            dfnsSchema.authTokenEnv.parse(signingProviders.dfns?.authTokenEnv)
        ),
        bitgoAccessToken: Env.get(
            bitgoSchema.accessTokenEnv.parse(
                signingProviders.bitgo?.accessTokenEnv
            )
        ),
    }
}

function legacySettings(): ProviderSettings {
    return {
        fireblocksApiPath: fireblocksSchema.apiPath.parse(
            Env.get('FIREBLOCKS_API_PATH')
        ),
        blockdaemonBaseUrl: blockdaemonSchema.baseUrl.parse(
            Env.get('BLOCKDAEMON_API_URL')
        ),
        blockdaemonCaip2: blockdaemonSchema.caip2.parse(
            Env.get('BLOCKDAEMON_CAIP2')
        ),
        dfnsOrgId: Env.get('DFNS_ORG_ID'),
        dfnsBaseUrl: dfnsSchema.baseUrl.parse(Env.get('DFNS_BASE_URL')),
        dfnsCredId: Env.get('DFNS_CRED_ID'),
        securosysBaseUrl: Env.get('SECUROSYS_TSB_BASE_URL'),
        securosysMtlsP12Path: Env.get('SECUROSYS_TSB_MTLS_P12_PATH'),
        securosysSignatureAlgorithm: securosysSchema.signatureAlgorithm.parse(
            Env.get('SECUROSYS_TSB_SIGNATURE_ALGORITHM')
        ),
        bitgoBaseUrl: bitgoSchema.baseUrl.parse(Env.get('BITGO_API_URL')),
        bitgoEnterpriseId: Env.get('BITGO_ENTERPRISE_ID'),
        bitgoCoin: Env.get('BITGO_COIN'),
    }
}

function explicitSettings(
    signingProviders: SigningProvidersConfig
): ProviderSettings {
    return {
        fireblocksApiPath: fireblocksSchema.apiPath.parse(
            signingProviders.fireblocks?.apiPath
        ),
        blockdaemonBaseUrl: blockdaemonSchema.baseUrl.parse(
            signingProviders.blockdaemon?.baseUrl
        ),
        blockdaemonCaip2: blockdaemonSchema.caip2.parse(
            signingProviders.blockdaemon?.caip2
        ),
        dfnsOrgId: signingProviders.dfns?.orgId,
        dfnsBaseUrl: dfnsSchema.baseUrl.parse(signingProviders.dfns?.baseUrl),
        dfnsCredId: signingProviders.dfns?.credId,
        securosysBaseUrl: signingProviders.securosys?.baseUrl,
        securosysMtlsP12Path: signingProviders.securosys?.mtlsP12Path,
        securosysSignatureAlgorithm: securosysSchema.signatureAlgorithm.parse(
            signingProviders.securosys?.signatureAlgorithm
        ),
        bitgoBaseUrl: bitgoSchema.baseUrl.parse(
            signingProviders.bitgo?.baseUrl
        ),
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
                    caip2: settings.blockdaemonCaip2,
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
