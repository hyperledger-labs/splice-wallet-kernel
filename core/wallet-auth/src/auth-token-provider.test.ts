// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, afterEach } from 'vitest'
import { assertConnected, jwtExpired } from './auth-utils.js'
import {
    AuthTokenProvider,
    type TokenProviderConfig,
} from './auth-token-provider.js'
import type { Auth, Idp } from './config/schema.js'
import { clientCredentialsService } from './client-credentials-service.js'
import { SelfSignedTokenService } from './self-signed-token-service.js'

vi.mock('./client-credentials-service.js', () => {
    return {
        clientCredentialsService: vi.fn(() => ({
            fetchToken: vi.fn(),
        })),
    }
})

describe('AuthTokenProvider', () => {
    afterEach(() => {
        vi.resetAllMocks()
    })

    const configUrl = 'http://idp/.well-known/openid-configuration'
    const tokenProviderConfig: TokenProviderConfig = {
        method: 'self_signed',
        issuer: 'unsafe-auth',
        credentials: {
            clientId: 'ledger-api-user',
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        },
    }
    it('should test an auth token provider initialization from TokenProviderConfig', async () => {
        const authProvider = new AuthTokenProvider(tokenProviderConfig)

        const authContext = await authProvider.getAuthContext()
        expect(assertConnected(authContext)).toBe(authContext)
        expect(jwtExpired(authContext.accessToken)).toBeFalsy()
    })

    it('should test an auth token provider initialization with fromToken', async () => {
        const token = await SelfSignedTokenService.fetchToken(
            tokenProviderConfig.credentials,
            tokenProviderConfig.issuer
        )

        const authProviderFromToken = AuthTokenProvider.fromToken(token)
        const authContext = await authProviderFromToken.getAuthContext()
        expect(assertConnected(authContext)).toBe(authContext)
    })

    it('should test an auth token provider initialization with fromGatewayConfig', async () => {
        const idp: Idp = {
            id: 'test1',
            type: 'self_signed',
            issuer: 'unsafe-auth',
        }

        const auth: Auth = {
            method: 'self_signed',
            issuer: 'unsafe-auth',
            clientId: 'ledger-api-user',
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        }

        const authProviderFromGateway = AuthTokenProvider.fromGatewayConfig(
            idp,
            auth
        )

        const authContext = await authProviderFromGateway.getAuthContext()
        expect(assertConnected(authContext)).toBe(authContext)
    })

    it('should test an auth token provider initialization with fromGatewayConfig with oauth', async () => {
        const authProvider = new AuthTokenProvider(tokenProviderConfig)

        const token = await authProvider.getAccessToken()

        const idp: Idp = {
            id: 'test1',
            type: 'oauth',
            issuer: 'unsafe-auth',
            configUrl,
        }

        const auth: Auth = {
            method: 'client_credentials',
            clientId: 'ledger-api-user',
            clientSecret: 'unsafe',
            audience: 'https://canton.network.global',
            scope: '',
        }

        const mockedServiceFactory = vi.mocked(clientCredentialsService)

        const mockFetchToken = vi.fn().mockResolvedValue(token)

        mockedServiceFactory.mockReturnValue({ fetchToken: mockFetchToken })

        const authProviderFromGateway = AuthTokenProvider.fromGatewayConfig(
            idp,
            auth
        )

        const authContext = await authProviderFromGateway.getAuthContext()
        expect(assertConnected(authContext)).toBe(authContext)
    })
})
