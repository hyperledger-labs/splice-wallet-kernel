// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { storeConfigSchema } from '@canton-network/core-wallet-store'
import { storeConfigSchema as signingStoreConfigSchema } from '@canton-network/core-signing-store-sql'
import { z } from 'zod'

export const kernelInfoSchema = z.object({
    id: z.string(),
    clientType: z.union([
        z.literal('browser'),
        z.literal('desktop'),
        z.literal('mobile'),
        z.literal('remote'),
    ]),
})

export const serverConfigSchema = z.object({
    host: z.string(),
    port: z.number(),
    tls: z.boolean(),
    dappPath: z.string().default('/api/v0/dapp'),
    userPath: z.string().default('/api/v0/user'),
    allowedOrigins: z.union([z.literal('*'), z.array(z.string())]).default('*'),
})

export const configSchema = z.object({
    kernel: kernelInfoSchema,
    server: serverConfigSchema,
    store: storeConfigSchema,
    signingStore: signingStoreConfigSchema,
})

export type KernelInfo = z.infer<typeof kernelInfoSchema>
export type ServerConfig = z.infer<typeof serverConfigSchema>
export type Config = z.infer<typeof configSchema>
