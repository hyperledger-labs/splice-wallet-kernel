// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'

export const ledgerApiSchema = z.object({
    baseUrl: z.string().url(),
})

const clientCredentials = z.object({
    clientId: z.string(),
    clientSecret: z.string(),
})

const passwordAuthSchema = z.object({
    identityProviderId: z.string(),
    type: z.literal('password'),
    issuer: z.string(),
    configUrl: z.string(),
    audience: z.string(),
    tokenUrl: z.string(),
    grantType: z.string(),
    scope: z.string(),
    clientId: z.string(),
    admin: z.optional(clientCredentials),
})

const implicitAuthSchema = z.object({
    identityProviderId: z.string(),
    type: z.literal('implicit'),
    issuer: z.string(),
    configUrl: z.string(),
    audience: z.string(),
    scope: z.string(),
    clientId: z.string(),
    admin: z.optional(clientCredentials),
})

const clientCredentialAuthSchema = z.object({
    identityProviderId: z.string(),
    type: z.literal('client_credentials'),
    issuer: z.string(),
    configUrl: z.string(),
    audience: z.string(),
    scope: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
    admin: z.optional(clientCredentials),
})

export const authSchema = z.discriminatedUnion('type', [
    passwordAuthSchema,
    implicitAuthSchema,
    clientCredentialAuthSchema,
])

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
export type Auth = z.infer<typeof authSchema>
export type Network = z.infer<typeof networkSchema>
export type ImplicitAuth = z.infer<typeof implicitAuthSchema>
export type PasswordAuth = z.infer<typeof passwordAuthSchema>
export type ClientCredentials = z.infer<typeof clientCredentials>
export type ClientCredentialAuth = z.infer<typeof clientCredentialAuthSchema>
export type LedgerApi = z.infer<typeof ledgerApiSchema>
