// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'

const authorizationCodeAuthSchema = z
    .object({
        method: z.literal('authorization_code'),
        audience: z.string(),
        scope: z.string(),
        clientId: z.string(),
    })
    .meta({
        description:
            'Authorization code flow authentication configuration. This is used for browser-based application login.',
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

const clientCredentialsEnvAuthSchema = z.object({
    method: z.literal('client_credentials'),
    audience: z.string(),
    scope: z.string(),
    clientId: z.string(),
    clientSecretEnv: z.string(),
})

const selfSignedEnvAuthSchema = z.object({
    method: z.literal('self_signed'),
    issuer: z.string(),
    audience: z.string(),
    scope: z.string(),
    clientId: z.string(),
    clientSecretEnv: z.string(),
})

export const authSchema = z.discriminatedUnion('method', [
    authorizationCodeAuthSchema,
    clientCredentialsAuthSchema,
    selfSignedAuthSchema,
])

export const authFromEnvSchema = z.discriminatedUnion('method', [
    authorizationCodeAuthSchema,
    clientCredentialsEnvAuthSchema,
    selfSignedEnvAuthSchema,
])

export type Auth = z.infer<typeof authSchema>
export type AuthFromEnv = z.infer<typeof authFromEnvSchema>
export type AuthorizationCodeAuth = z.infer<typeof authorizationCodeAuthSchema>
export type ClientCredentialsAuth = z.infer<typeof clientCredentialsAuthSchema>
export type SelfSignedAuth = z.infer<typeof selfSignedAuthSchema>

export const idpSchema = z.discriminatedUnion('type', [
    z.object({
        id: z.string(),
        type: z.literal('self_signed'),
        issuer: z.string(),
    }),
    z.object({
        id: z.string(),
        type: z.literal('oauth'),
        issuer: z.string(),
        configUrl: z.string().url(),
    }),
])

export type Idp = z.infer<typeof idpSchema>
