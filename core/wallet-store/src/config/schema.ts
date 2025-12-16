// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { authSchema, idpSchema } from '@canton-network/core-wallet-auth'
import { z } from 'zod'

export const ledgerApiSchema = z.object({
    baseUrl: z.string().url(),
})

export const networkSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    synchronizerId: z.string().optional(),
    identityProviderId: z.string(),
    ledgerApi: ledgerApiSchema,
    auth: authSchema,
    adminAuth: authSchema.optional(),
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
    idps: z.array(idpSchema),
    networks: z.array(networkSchema),
})

export const verifiedNetworkSchema = networkSchema.extend({
    verified: z.boolean(),
})

export type StoreConfig = z.infer<typeof storeConfigSchema>
export type Network = z.infer<typeof networkSchema>
export type VerifiedNetwork = z.infer<typeof verifiedNetworkSchema>
export type LedgerApi = z.infer<typeof ledgerApiSchema>
