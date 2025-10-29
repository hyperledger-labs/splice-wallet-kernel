// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'

const pkceAuthSchema = z.object({
    method: z.literal('pkce'),
    audience: z.string(),
    scope: z.string(),
    clientId: z.string(),
})

const clientCredentialsAuthSchema = z.object({
    method: z.literal('client_credentials'),
    audience: z.string(),
    scope: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
})

const selfSignedAuthSchema = z.object({
    method: z.literal('self_signed'),
    issuer: z.string(),
    audience: z.string(),
    scope: z.string(),
    clientId: z.string(),
    clientSecret: z.string(),
})

export const authSchema = z.discriminatedUnion('method', [
    pkceAuthSchema,
    clientCredentialsAuthSchema,
    selfSignedAuthSchema,
])

export type Auth = z.infer<typeof authSchema>
export type PkceAuth = z.infer<typeof pkceAuthSchema>
export type ClientCredentialsAuth = z.infer<typeof clientCredentialsAuthSchema>
export type SelfSignedAuth = z.infer<typeof selfSignedAuthSchema>
