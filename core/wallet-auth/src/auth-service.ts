// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type UserId = string

export interface AuthContext {
    userId: UserId
    accessToken: string
}

export interface AuthService {
    verifyToken(accessToken?: string): Promise<AuthContext | undefined>
}

export interface TokenProvider {
    getToken(): Promise<string | undefined>
    getAdminToken(): Promise<string | undefined>
}

export interface AuthAware<T> {
    authContext: AuthContext | undefined
    withAuthContext: (context?: AuthContext) => T
}

export interface OIDCConfig {
    token_endpoint: string
}

export interface ClientCredentials {
    clientId: string
    clientSecret: string
    scope: string | undefined
    audience: string | undefined
}
