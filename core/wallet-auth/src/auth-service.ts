// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type UserId = string

/**
 * Authentication context containing user ID and access token
 */
export type AuthContext =
    | {
          userId: UserId
          accessToken: string
          email?: string
          isApiKey?: false
          /** Tokenless self-issued login session, set only while accessToken is empty. */
          sessionId?: string
      }
    | {
          isApiKey: true
          userId: UserId
          ledgerUserId: UserId
          accessToken: string
          email?: string
      }

/**
 * Interface for types that are aware of authentication context
 */
export interface AuthAware<T> {
    authContext: AuthContext | undefined
    withAuthContext: (context?: AuthContext) => T
}

/**
 * Thrown when a token could not be verified because the identity provider
 * could not be reached or returned unusable data, as opposed to the token
 * itself being invalid.
 */
export class IdpUnavailableError extends Error {
    constructor(message: string, options?: { cause?: unknown }) {
        super(message, options)
        this.name = 'IdpUnavailableError'
    }
}

/**
 * Interface for verifying access tokens
 */
export interface AuthService {
    /**
     * @returns the auth context, or undefined if the token is missing or invalid
     * @throws {IdpUnavailableError} if the verification depends on an identity
     * provider that is currently unavailable, the token may still be valid
     */
    verifyToken(accessToken?: string): Promise<AuthContext | undefined>
}

/**
 * Interface for providing access tokens used to authenticate requests
 */
export interface AccessTokenProvider {
    getAccessToken(): Promise<string>
    getAuthContext(): Promise<AuthContext>
}

export interface ClientCredentials {
    clientId: string
    clientSecret: string
    scope: string | undefined
    audience: string | undefined
}
