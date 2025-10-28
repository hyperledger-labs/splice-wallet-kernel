// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type UserId = string

/**
 * Authentication context containing user ID and access token
 */
export interface AuthContext {
    userId: UserId
    accessToken: string
}

/**
 * Interface for types that are aware of authentication context
 */
export interface AuthAware<T> {
    authContext: AuthContext | undefined
    withAuthContext: (context?: AuthContext) => T
}

/**
 * Interface for verifying access tokens
 */
export interface AuthService {
    verifyToken(accessToken?: string): Promise<AuthContext | undefined>
}

/**
 * Interface for providing access tokens used to authenticate requests
 */
export interface AccessTokenProvider {
    getUserAccessToken(): Promise<string>
    getAdminAccessToken(): Promise<string>
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
