// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'
import {
    storeConfigSchema,
    bootstrapConfigSchema,
    networkSchema,
} from '@canton-network/core-wallet-store'
import { storeConfigSchema as signingStoreConfigSchema } from '@canton-network/core-signing-store-sql'
import { authFromEnvSchema, authSchema } from '@canton-network/core-wallet-auth'
import { cantonCaip2Values } from '@canton-network/core-signing-blockdaemon'

export const kernelInfoSchema = z.object({
    id: z.string(),
    publicUrl: z.string().optional().meta({
        description:
            'The public base URL of the gateway, if available (e.g. https://wallet.example.com). This determines what browsers will try to use to connect, and is useful when using reverse proxies. If omitted, this will be derived from the server configuration.',
    }),
    clientType: z.union([
        z.literal('browser'),
        z.literal('desktop'),
        z.literal('mobile'),
        z.literal('remote'),
    ]),
})

export const serverConfigSchema = z.object({
    port: z.number().default(3030).meta({
        description:
            'The port on which the NodeJS service will listen. Defaults to 3030.',
    }),
    dappPath: z.string().default('/api/v0/dapp').meta({
        description: 'The path serving the dapp API. Defaults /api/v0/dapp',
    }),
    userPath: z.string().default('/api/v0/user').meta({
        description: 'The path serving the user API. Defaults /api/v0/user',
    }),
    allowedOrigins: z
        .union([z.literal('*'), z.array(z.string())])
        .default('*')
        .meta({
            description:
                'Allowed CORS origins, typically corresponding to which external dApps are allowed to connect. Use "*" to allow all origins, or set an array of origin strings.',
        }),

    // @deprecated, the NodeJS server always binds to the localhost interface
    host: z.string().optional().meta({
        deprecated: true,
        description:
            'The host interface the server binds to. Deprecated as the service always binds to the local machine network interface. Will be removed in a future release.',
    }),
    // @deprecated since this field does not actually control TLS termination
    tls: z.boolean().optional().meta({
        deprecated: true,
        description:
            'Deprecated, this option no longer has any effect. Will be removed in a future release.',
    }),
    requestSizeLimit: z.string().default('1mb').meta({
        description: 'The maximum size of incoming requests. Defaults to 1mb.',
    }),
    requestRateLimit: z.number().default(10000).meta({
        description:
            'The maximum number of requests per minute from a single IP address. Defaults to 10000.',
    }),
    trustProxy: z
        .union([z.boolean(), z.number().int().min(0), z.string()])
        .default(false)
        .meta({
            description:
                'Express trust proxy setting used to resolve client IP addresses when running behind reverse proxies/load balancers. Set this correctly in production (for example 1 for a single trusted proxy hop). Defaults to false.',
        }),
    admin: z.string().optional().meta({
        description:
            'The JWT claim (e.g. "sub") identifying the admin user. If set, requests with a matching claim will be granted admin privileges.',
    }),
    signingWorker: z
        .object({
            pollInterval: z.number().int().positive().default(5000).meta({
                description:
                    'Interval in milliseconds for the signing worker to poll external signing providers on pending transactions. Defaults to 5000.',
            }),
        })
        .prefault({}),
})

const loggingConfigSchema = z
    .object({
        level: z
            .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
            .optional()
            .meta({
                description:
                    'The log level for the gateway. If omitted, defaults to info.',
            }),
        format: z.enum(['json', 'pretty']).optional().meta({
            description:
                'The log format for the gateway. If omitted, defaults to pretty.',
        }),
    })
    .meta({
        description:
            'Optional logging configuration. If omitted, defaults will be used.',
    })

const authFromEnvOrConfig = z.union([authSchema, authFromEnvSchema])

const bootstrapFromEnv = bootstrapConfigSchema.extend({
    networks: z.array(
        networkSchema.extend({
            auth: authFromEnvOrConfig,
            adminAuth: authFromEnvOrConfig.optional(),
            serviceAccountAuth: authFromEnvOrConfig.optional(),
        })
    ),
})

const secretEnvName = (defaultName: string, purpose: string) =>
    z
        .string()
        .default(defaultName)
        .meta({
            description: `Name of the environment variable that holds ${purpose}. The secret value stays in the environment and is never stored in the config file.`,
        })

export const signingProvidersConfigSchema = z
    .object({
        walletKernel: z.object({}).optional().meta({
            description:
                'Include this object to opt in the Wallet Kernel internal signing provider. Requires signingStore.',
        }),
        participant: z.object({}).optional().meta({
            description:
                'Include this object to opt in the participant signing provider.',
        }),
        fireblocks: z
            .object({
                apiPath: z
                    .string()
                    .default('https://api.fireblocks.io/v1')
                    .meta({
                        description: 'Fireblocks API URL.',
                    }),
                apiKeyEnv: secretEnvName(
                    'FIREBLOCKS_API_KEY',
                    'the Fireblocks API key'
                ),
                secretEnv: secretEnvName(
                    'FIREBLOCKS_SECRET',
                    'the Fireblocks API secret'
                ),
            })
            .optional()
            .meta({
                description:
                    'Include this object to opt in Fireblocks. Secrets are read from the environment variables named by apiKeyEnv and secretEnv.',
            }),
        blockdaemon: z
            .object({
                baseUrl: z
                    .string()
                    .default('http://localhost:5080/api/cwp/canton')
                    .meta({
                        description: 'Blockdaemon API URL.',
                    }),
                caip2: z
                    .enum(cantonCaip2Values)
                    .default('canton:testnet')
                    .meta({
                        description: 'Blockdaemon CAIP-2 network identifier.',
                    }),
                apiKeyEnv: secretEnvName(
                    'BLOCKDAEMON_API_KEY',
                    'the Blockdaemon API key'
                ),
            })
            .optional()
            .meta({
                description:
                    'Include this object to opt in Blockdaemon. The API key is read from the environment variable named by apiKeyEnv.',
            }),
        dfns: z
            .object({
                orgId: z.string().meta({
                    description: 'Dfns organization ID.',
                }),
                baseUrl: z.string().default('https://api.dfns.io').meta({
                    description: 'Dfns API URL.',
                }),
                credId: z.string().meta({
                    description: 'Dfns service account credential ID.',
                }),
                privateKeyEnv: secretEnvName(
                    'DFNS_PRIVATE_KEY',
                    'the Dfns service account private key'
                ),
                authTokenEnv: secretEnvName(
                    'DFNS_AUTH_TOKEN',
                    'the Dfns service account auth token'
                ),
            })
            .optional()
            .meta({
                description:
                    'Include this object to opt in Dfns. Requires orgId and credId. Secrets are read from the environment variables named by privateKeyEnv and authTokenEnv.',
            }),
        securosys: z
            .object({
                baseUrl: z.string().meta({
                    description: 'Securosys TSB service URL.',
                }),
                mtlsP12Path: z.string().optional().meta({
                    description:
                        'Path to a PKCS#12 client certificate when TSB requires mTLS.',
                }),
                signatureAlgorithm: z.string().default('EDDSA').meta({
                    description: 'Securosys TSB signature algorithm.',
                }),
                keyManagementApiKeyEnv: secretEnvName(
                    'SECUROSYS_TSB_KEY_MANAGEMENT_API_KEY',
                    'the Securosys key-management API key'
                ),
                keyOperationApiKeyEnv: secretEnvName(
                    'SECUROSYS_TSB_KEY_OPERATION_API_KEY',
                    'the Securosys key-operation API key'
                ),
                bearerTokenEnv: secretEnvName(
                    'SECUROSYS_TSB_BEARER_TOKEN',
                    'the Securosys bearer token'
                ),
                mtlsP12PasswordEnv: secretEnvName(
                    'SECUROSYS_TSB_MTLS_P12_PASSWORD',
                    'the Securosys PKCS#12 password'
                ),
                keyPasswordEnv: secretEnvName(
                    'SECUROSYS_TSB_KEY_PASSWORD',
                    'the Securosys key password'
                ),
            })
            .optional()
            .meta({
                description:
                    'Include this object to opt in Securosys. Requires baseUrl. Secrets are read from the environment variables named by the *Env fields.',
            }),
        bitgo: z
            .object({
                baseUrl: z.string().default('https://app.bitgo.com').meta({
                    description: 'BitGo API base URL.',
                }),
                enterpriseId: z.string().optional().meta({
                    description:
                        'BitGo enterprise ID. Required for wallet creation.',
                }),
                coin: z.string().optional().meta({
                    description:
                        'BitGo Canton coin identifier. Auto-detected from the API URL when omitted.',
                }),
                accessTokenEnv: secretEnvName(
                    'BITGO_ACCESS_TOKEN',
                    'the BitGo access token'
                ),
            })
            .optional()
            .meta({
                description:
                    'Include this object to opt in BitGo. The access token is read from the environment variable named by accessTokenEnv.',
            }),
    })
    .meta({
        description:
            'Explicit signing provider configuration. When omitted, the Wallet Gateway uses legacy discovery: every provider is available if its required environment variables are set. When present, only listed providers are registered; non-secret settings come from this object, and secrets are read from environment variables named by the *Env fields.',
    })

const hashingSchemeSchema = z
    .object({
        version: z
            .enum(['HASHING_SCHEME_VERSION_V2', 'HASHING_SCHEME_VERSION_V3'])
            .meta({
                description:
                    'Hashing scheme version for the ledger. If omitted, defaults to HASHING_SCHEME_VERSION_V3',
            }),
    })
    .optional()

// Includes secrets for networks as env vars, rather than defined explicitly
export const rawConfigSchema = z.object({
    kernel: kernelInfoSchema,
    server: serverConfigSchema.prefault({}),
    logging: z.preprocess((val) => val ?? {}, loggingConfigSchema).optional(),
    store: storeConfigSchema,
    signingStore: signingStoreConfigSchema.optional(),
    signingProviders: signingProvidersConfigSchema.optional(),
    bootstrap: bootstrapFromEnv,
    hashingScheme: hashingSchemeSchema,
})

export const configSchema = z.object({
    kernel: kernelInfoSchema,
    server: serverConfigSchema.prefault({}),
    logging: z.preprocess((val) => val ?? {}, loggingConfigSchema).optional(),
    store: storeConfigSchema,
    signingStore: signingStoreConfigSchema.optional(),
    signingProviders: signingProvidersConfigSchema.optional(),
    bootstrap: bootstrapConfigSchema,
    hashingScheme: hashingSchemeSchema,
})

export type KernelInfo = z.infer<typeof kernelInfoSchema>
export type ServerConfig = z.infer<typeof serverConfigSchema>
export type SigningProvidersConfig = z.infer<
    typeof signingProvidersConfigSchema
>
export type RawConfig = z.infer<typeof rawConfigSchema>
export type Config = z.infer<typeof configSchema>
