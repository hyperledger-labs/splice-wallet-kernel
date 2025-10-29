// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'

const credentials = z.object({
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
    admin: z.optional(credentials),
})

const implicitAuthSchema = z.object({
    identityProviderId: z.string(),
    type: z.literal('implicit'),
    issuer: z.string(),
    configUrl: z.string(),
    audience: z.string(),
    scope: z.string(),
    clientId: z.string(),
    admin: z.optional(credentials),
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
    admin: z.optional(credentials),
})

const selfSignedAuthSchema = z.object({
    identityProviderId: z.string(),
    type: z.literal('self_signed'),
    issuer: z.string(),
    audience: z.string(),
    scope: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
    admin: z.optional(credentials),
})

export const authSchema = z.discriminatedUnion('type', [
    passwordAuthSchema,
    implicitAuthSchema,
    clientCredentialAuthSchema,
    selfSignedAuthSchema,
])

export type Auth = z.infer<typeof authSchema>
export type ImplicitAuth = z.infer<typeof implicitAuthSchema>
export type PasswordAuth = z.infer<typeof passwordAuthSchema>
export type Credentials = z.infer<typeof credentials>
export type ClientCredentialAuth = z.infer<typeof clientCredentialAuthSchema>
export type SelfSignedAuth = z.infer<typeof selfSignedAuthSchema>
