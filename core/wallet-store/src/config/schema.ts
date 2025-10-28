// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { authSchema } from '@canton-network/core-wallet-auth'
import { z } from 'zod'

export const ledgerApiSchema = z.object({
    baseUrl: z.string().url(),
})

export const networkSchema = z.object({
    name: z.string(),
    chainId: z.string(),
    synchronizerId: z.string(),
    description: z.string(),
    ledgerApi: ledgerApiSchema,
    auth: authSchema,
})

export const storeConfigSchema = z.object({
    connection: z.discriminatedUnion('type', [
        z.object({
            type: z.literal('memory'),
        }),
        z.object({
            type: z.literal('sqlite'),
            database: z.string(),
        }),
        z.object({
            type: z.literal('postgres'),
            host: z.string(),
            port: z.number(),
            user: z.string(),
            password: z.string(),
            database: z.string(),
        }),
    ]),
    networks: z.array(networkSchema),
})

export type StoreConfig = z.infer<typeof storeConfigSchema>
export type Network = z.infer<typeof networkSchema>
export type LedgerApi = z.infer<typeof ledgerApiSchema>
