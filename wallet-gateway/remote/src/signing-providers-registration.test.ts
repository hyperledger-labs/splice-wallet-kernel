// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SigningProvider } from '@canton-network/core-signing-lib'
import type { StoreSql as SigningStoreSql } from '@canton-network/core-signing-store-sql'
import type { Logger } from 'pino'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { signingProvidersConfigSchema } from './config/Config.js'
import { registerSigningProviders } from './signing-providers-registration.js'

const providerConstructors = vi.hoisted(() => ({
    bitgo: vi.fn(),
    blockdaemon: vi.fn(),
    dfns: vi.fn(),
    fireblocks: vi.fn(),
    securosys: vi.fn(),
}))

vi.mock('@canton-network/core-signing-bitgo', () => ({
    default: providerConstructors.bitgo,
}))
vi.mock('@canton-network/core-signing-blockdaemon', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-signing-blockdaemon')
        >()
    return {
        ...actual, // need exported values for caip2
        default: providerConstructors.blockdaemon,
    }
})
vi.mock('@canton-network/core-signing-dfns', () => ({
    default: providerConstructors.dfns,
}))
vi.mock('@canton-network/core-signing-fireblocks', () => ({
    default: providerConstructors.fireblocks,
}))
vi.mock('@canton-network/core-signing-securosys', () => ({
    default: providerConstructors.securosys,
}))

const signingProviderEnvVars = [
    'FIREBLOCKS_API_KEY',
    'FIREBLOCKS_SECRET',
    'FIREBLOCKS_API_PATH',
    'BLOCKDAEMON_API_KEY',
    'BLOCKDAEMON_API_URL',
    'BLOCKDAEMON_CAIP2',
    'DFNS_ORG_ID',
    'DFNS_BASE_URL',
    'DFNS_CRED_ID',
    'DFNS_PRIVATE_KEY',
    'DFNS_AUTH_TOKEN',
    'SECUROSYS_TSB_BASE_URL',
    'SECUROSYS_TSB_KEY_MANAGEMENT_API_KEY',
    'SECUROSYS_TSB_KEY_OPERATION_API_KEY',
    'SECUROSYS_TSB_BEARER_TOKEN',
    'SECUROSYS_TSB_MTLS_P12_PATH',
    'SECUROSYS_TSB_MTLS_P12_PASSWORD',
    'SECUROSYS_TSB_KEY_PASSWORD',
    'SECUROSYS_TSB_SIGNATURE_ALGORITHM',
    'BITGO_ACCESS_TOKEN',
    'BITGO_API_URL',
    'BITGO_ENTERPRISE_ID',
    'BITGO_COIN',
]

describe('registerSigningProviders', () => {
    const signingStore = {} as SigningStoreSql
    const logger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn(),
    } as unknown as Logger

    beforeEach(() => {
        vi.clearAllMocks()
        // Local .env can already define these. unstubAllEnvs restores
        // that inherited value, so absence tests must start from an empty stub.
        for (const envVar of signingProviderEnvVars) {
            vi.stubEnv(envVar, '')
        }
    })

    afterEach(() => vi.unstubAllEnvs())

    describe('legacy mode (signingProviders omitted)', () => {
        test('registers participant and wallet kernel by default', () => {
            const drivers = registerSigningProviders(
                undefined,
                signingStore,
                logger
            )

            expect(drivers[SigningProvider.PARTICIPANT]).toBeDefined()
            expect(drivers[SigningProvider.WALLET_KERNEL]).toBeDefined()
            expect(logger.info).toHaveBeenCalledWith(
                expect.stringContaining('legacy discovery')
            )
            expect(logger.warn).toHaveBeenCalledWith(
                'Fireblocks environment variables not fully set. Fireblocks signing provider will be unavailable.'
            )
            expect(logger.warn).toHaveBeenCalledWith(
                'Blockdaemon environment variables not fully set. Blockdaemon signing provider will be unavailable.'
            )
            expect(logger.warn).toHaveBeenCalledWith(
                'Securosys environment variables not fully set. Securosys signing provider will be unavailable.'
            )
            expect(logger.warn).toHaveBeenCalledWith(
                'Dfns environment variables not fully set. Dfns signing provider will be unavailable.'
            )
            expect(logger.warn).toHaveBeenCalledWith(
                'BitGo environment variables not fully set. BitGo signing provider will be unavailable.'
            )
        })

        test('does not register wallet kernel when signingStore is unavailable', () => {
            const drivers = registerSigningProviders(
                undefined,
                undefined,
                logger
            )

            expect(Object.keys(drivers)).toEqual([SigningProvider.PARTICIPANT])
        })

        test('registers external providers from environment variables', () => {
            vi.stubEnv('FIREBLOCKS_API_KEY', 'fireblocks-key')
            vi.stubEnv('FIREBLOCKS_SECRET', 'fireblocks-secret')
            vi.stubEnv('FIREBLOCKS_API_PATH', 'https://fireblocks.env/v1')
            vi.stubEnv('BLOCKDAEMON_API_KEY', 'blockdaemon-key')
            vi.stubEnv('BLOCKDAEMON_API_URL', 'https://blockdaemon.env')
            vi.stubEnv('BLOCKDAEMON_CAIP2', 'canton:mainnet')
            vi.stubEnv('DFNS_ORG_ID', 'dfns-org')
            vi.stubEnv('DFNS_BASE_URL', 'https://dfns.env')
            vi.stubEnv('DFNS_CRED_ID', 'dfns-credential')
            vi.stubEnv('DFNS_PRIVATE_KEY', 'dfns-private-key')
            vi.stubEnv('DFNS_AUTH_TOKEN', 'dfns-token')
            vi.stubEnv('SECUROSYS_TSB_BASE_URL', 'https://securosys.env')
            vi.stubEnv('SECUROSYS_TSB_KEY_MANAGEMENT_API_KEY', 'management-key')
            vi.stubEnv('SECUROSYS_TSB_KEY_OPERATION_API_KEY', 'operation-key')
            vi.stubEnv('SECUROSYS_TSB_MTLS_P12_PATH', '/env/client.p12')
            vi.stubEnv('SECUROSYS_TSB_SIGNATURE_ALGORITHM', 'SHA256_WITH_ECDSA')
            vi.stubEnv('BITGO_ACCESS_TOKEN', 'bitgo-token')
            vi.stubEnv('BITGO_API_URL', 'https://bitgo.env')
            vi.stubEnv('BITGO_ENTERPRISE_ID', 'bitgo-enterprise')
            vi.stubEnv('BITGO_COIN', 'tcanton')

            registerSigningProviders(undefined, signingStore, logger)

            expect(providerConstructors.fireblocks).toHaveBeenCalledWith(
                expect.objectContaining({
                    apiPath: 'https://fireblocks.env/v1',
                })
            )
            expect(providerConstructors.blockdaemon).toHaveBeenCalledWith({
                baseUrl: 'https://blockdaemon.env',
                apiKey: 'blockdaemon-key',
                caip2: 'canton:mainnet',
            })
            expect(providerConstructors.dfns).toHaveBeenCalledWith(
                expect.objectContaining({
                    orgId: 'dfns-org',
                    baseUrl: 'https://dfns.env',
                    credentials: expect.objectContaining({
                        credId: 'dfns-credential',
                    }),
                })
            )
            expect(providerConstructors.securosys).toHaveBeenCalledWith(
                expect.objectContaining({
                    baseUrl: 'https://securosys.env',
                    mtlsP12Path: '/env/client.p12',
                    signatureAlgorithm: 'SHA256_WITH_ECDSA',
                })
            )
            expect(providerConstructors.bitgo).toHaveBeenCalledWith({
                accessToken: 'bitgo-token',
                baseUrl: 'https://bitgo.env',
                enterpriseId: 'bitgo-enterprise',
                coin: 'tcanton',
            })
        })
    })

    describe('explicit mode (signingProviders present)', () => {
        test('registers no drivers when the object is empty', () => {
            expect(
                registerSigningProviders(
                    signingProvidersConfigSchema.parse({}),
                    signingStore,
                    logger
                )
            ).toEqual({})
        })

        test('registers only opted-in providers', () => {
            const drivers = registerSigningProviders(
                signingProvidersConfigSchema.parse({
                    participant: {},
                    fireblocks: {},
                }),
                signingStore,
                logger
            )

            expect(Object.keys(drivers)).toEqual([SigningProvider.PARTICIPANT])
            expect(drivers[SigningProvider.WALLET_KERNEL]).toBeUndefined()
            expect(drivers[SigningProvider.FIREBLOCKS]).toBeUndefined()
        })

        test('reads secrets from configured env var names', () => {
            vi.stubEnv('FIREBLOCKS_API_KEY', 'default-key')
            vi.stubEnv('FIREBLOCKS_SECRET', 'default-secret')
            vi.stubEnv('MY_FIREBLOCKS_API_KEY', 'custom-key')
            vi.stubEnv('MY_FIREBLOCKS_SECRET', 'custom-secret')
            vi.stubEnv('BITGO_ACCESS_TOKEN', 'default-token')
            vi.stubEnv('MY_BITGO_TOKEN', 'custom-token')

            registerSigningProviders(
                signingProvidersConfigSchema.parse({
                    fireblocks: {
                        apiKeyEnv: 'MY_FIREBLOCKS_API_KEY',
                        secretEnv: 'MY_FIREBLOCKS_SECRET',
                    },
                    bitgo: {
                        accessTokenEnv: 'MY_BITGO_TOKEN',
                        enterpriseId: 'enterprise',
                    },
                }),
                signingStore,
                logger
            )

            expect(providerConstructors.fireblocks).toHaveBeenCalledWith(
                expect.objectContaining({
                    defaultKeyInfo: {
                        apiKey: 'custom-key',
                        apiSecret: 'custom-secret',
                    },
                })
            )
            expect(providerConstructors.bitgo).toHaveBeenCalledWith({
                accessToken: 'custom-token',
                baseUrl: 'https://app.bitgo.com',
                enterpriseId: 'enterprise',
                coin: undefined,
            })
        })

        describe('Participant', () => {
            test('registers when opted in', () => {
                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({ participant: {} }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.PARTICIPANT]).toBeDefined()
            })
        })

        describe('Wallet Kernel', () => {
            test('does not register when signingStore is unavailable', () => {
                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({ walletKernel: {} }),
                    undefined,
                    logger
                )

                expect(drivers[SigningProvider.WALLET_KERNEL]).toBeUndefined()
            })

            test('registers when opted in and signingStore is available', () => {
                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({ walletKernel: {} }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.WALLET_KERNEL]).toBeDefined()
            })
        })

        describe('Fireblocks', () => {
            test('does not register when required secrets are missing', () => {
                vi.stubEnv('FIREBLOCKS_API_KEY', 'api-key')

                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({ fireblocks: {} }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.FIREBLOCKS]).toBeUndefined()
                expect(logger.warn).toHaveBeenCalledWith(
                    'Fireblocks environment variables not fully set. Fireblocks signing provider will be unavailable.'
                )
            })

            test('registers with config and secrets', () => {
                vi.stubEnv('FIREBLOCKS_API_KEY', 'api-key')
                vi.stubEnv('FIREBLOCKS_SECRET', 'api-secret')

                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({
                        fireblocks: {
                            apiPath: 'https://fireblocks.example/v1',
                        },
                    }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.FIREBLOCKS]).toBeDefined()
                expect(providerConstructors.fireblocks).toHaveBeenCalledWith(
                    expect.objectContaining({
                        apiPath: 'https://fireblocks.example/v1',
                    })
                )
            })
        })

        describe('Blockdaemon', () => {
            test('does not register when the API key is missing', () => {
                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({
                        blockdaemon: { baseUrl: 'https://blockdaemon.example' },
                    }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.BLOCKDAEMON]).toBeUndefined()
                expect(logger.warn).toHaveBeenCalledWith(
                    'Blockdaemon environment variables not fully set. Blockdaemon signing provider will be unavailable.'
                )
            })

            test('registers with config and API key', () => {
                vi.stubEnv('BLOCKDAEMON_API_KEY', 'api-key')

                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({
                        blockdaemon: {
                            baseUrl: 'https://blockdaemon.example',
                            caip2: 'canton:mainnet',
                        },
                    }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.BLOCKDAEMON]).toBeDefined()
                expect(providerConstructors.blockdaemon).toHaveBeenCalledWith({
                    baseUrl: 'https://blockdaemon.example',
                    apiKey: 'api-key',
                    caip2: 'canton:mainnet',
                })
            })
        })

        describe('Securosys', () => {
            test('rejects config without a base URL', () => {
                expect(() =>
                    signingProvidersConfigSchema.parse({ securosys: {} })
                ).toThrow()
            })

            test('registers with API-key authentication', () => {
                vi.stubEnv(
                    'SECUROSYS_TSB_KEY_MANAGEMENT_API_KEY',
                    'management-key'
                )
                vi.stubEnv(
                    'SECUROSYS_TSB_KEY_OPERATION_API_KEY',
                    'operation-key'
                )

                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({
                        securosys: {
                            baseUrl: 'https://securosys.example',
                            signatureAlgorithm: 'EDDSA',
                        },
                    }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.SECUROSYS]).toBeDefined()
                expect(providerConstructors.securosys).toHaveBeenCalledWith(
                    expect.objectContaining({
                        baseUrl: 'https://securosys.example',
                        keyManagementApiKey: 'management-key',
                        keyOperationApiKey: 'operation-key',
                        signatureAlgorithm: 'EDDSA',
                    })
                )
            })

            test('registers with bearer-token authentication without API keys', () => {
                vi.stubEnv('SECUROSYS_TSB_BEARER_TOKEN', 'bearer-token')

                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({
                        securosys: { baseUrl: 'https://securosys.example' },
                    }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.SECUROSYS]).toBeDefined()
                expect(providerConstructors.securosys).toHaveBeenCalledWith(
                    expect.objectContaining({
                        baseUrl: 'https://securosys.example',
                        bearerToken: 'bearer-token',
                    })
                )
            })

            test('registers with mTLS authentication without API keys', () => {
                vi.stubEnv('SECUROSYS_TSB_MTLS_P12_PASSWORD', 'p12-password')

                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({
                        securosys: {
                            baseUrl: 'https://securosys.example',
                            mtlsP12Path: '/secrets/client.p12',
                        },
                    }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.SECUROSYS]).toBeDefined()
                expect(providerConstructors.securosys).toHaveBeenCalledWith(
                    expect.objectContaining({
                        baseUrl: 'https://securosys.example',
                        mtlsP12Path: '/secrets/client.p12',
                        mtlsP12Password: 'p12-password',
                    })
                )
            })
        })

        describe('Dfns', () => {
            test('rejects config without orgId or credId', () => {
                expect(() =>
                    signingProvidersConfigSchema.parse({ dfns: {} })
                ).toThrow()
            })

            test('does not register when required secrets are missing', () => {
                vi.stubEnv('DFNS_PRIVATE_KEY', 'private-key')

                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({
                        dfns: { orgId: 'org-id', credId: 'credential-id' },
                    }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.DFNS]).toBeUndefined()
                expect(logger.warn).toHaveBeenCalledWith(
                    'Dfns environment variables not fully set. Dfns signing provider will be unavailable.'
                )
            })

            test('registers with config and secrets', () => {
                vi.stubEnv('DFNS_PRIVATE_KEY', 'private-key')
                vi.stubEnv('DFNS_AUTH_TOKEN', 'auth-token')

                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({
                        dfns: {
                            orgId: 'org-id',
                            credId: 'credential-id',
                            baseUrl: 'https://dfns.example',
                        },
                    }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.DFNS]).toBeDefined()
                expect(providerConstructors.dfns).toHaveBeenCalledWith({
                    orgId: 'org-id',
                    baseUrl: 'https://dfns.example',
                    credentials: {
                        credId: 'credential-id',
                        privateKey: 'private-key',
                        authToken: 'auth-token',
                    },
                })
            })
        })

        describe('BitGo', () => {
            test('does not register when access token is missing', () => {
                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({ bitgo: {} }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.BITGO]).toBeUndefined()
                expect(logger.warn).toHaveBeenCalledWith(
                    'BitGo environment variables not fully set. BitGo signing provider will be unavailable.'
                )
            })

            test('registers without enterprise ID and warns about limited functionality', () => {
                vi.stubEnv('BITGO_ACCESS_TOKEN', 'access-token')

                const drivers = registerSigningProviders(
                    signingProvidersConfigSchema.parse({ bitgo: {} }),
                    signingStore,
                    logger
                )

                expect(drivers[SigningProvider.BITGO]).toBeDefined()
                expect(logger.warn).toHaveBeenCalledWith(
                    expect.stringContaining('BitGo enterprise ID is not set')
                )
            })
        })
    })
})
