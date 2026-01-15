// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { storeConfigSchema } from '@canton-network/core-wallet-store'
import { storeConfigSchema as signingStoreConfigSchema } from '@canton-network/core-signing-store-sql'
import { z } from 'zod'

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
    requestRateLimit: z.number().default(100).meta({
        description:
            'The maximum number of requests per minute from a single IP address. Defaults to 100.',
    }),
})

export const configSchema = z.object({
    kernel: kernelInfoSchema,
    server: z.preprocess((val) => val ?? {}, serverConfigSchema),
    store: storeConfigSchema,
    signingStore: signingStoreConfigSchema,
})

export type KernelInfo = z.infer<typeof kernelInfoSchema>
export type ServerConfig = z.infer<typeof serverConfigSchema>
export type Config = z.infer<typeof configSchema>
