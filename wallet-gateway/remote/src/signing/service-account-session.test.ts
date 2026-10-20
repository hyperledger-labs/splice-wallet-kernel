// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'
import { pino } from 'pino'
import { sink } from 'pino-test'
import type { Network } from '@canton-network/core-wallet-store'
import type { Idp } from '@canton-network/core-wallet-auth'
import { resolveAutomationRunContext } from './service-account-session.js'

vi.mock('@canton-network/core-wallet-auth', async () => {
    const actual = await vi.importActual<
        typeof import('@canton-network/core-wallet-auth')
    >('@canton-network/core-wallet-auth')
    return {
        ...actual,
        AuthTokenProvider: {
            fromGatewayConfig: vi.fn().mockReturnValue({
                getAuthContext: vi.fn().mockResolvedValue({
                    userId: 'service_account',
                    accessToken: 'abc',
                }),
            }),
        },
    }
})

const idp: Idp = {
    id: 'idp1',
    type: 'oauth',
    issuer: 'https://issuer.example',
    configUrl: 'https://issuer.example/.well-known/openid-configuration',
}

const m2mNetwork: Network = {
    id: 'net-m2m',
    name: 'm2m',
    description: '',
    synchronizerId: 'sync::fp',
    identityProviderId: 'idp1',
    ledgerApi: { baseUrl: 'http://ledger' },
    auth: {
        method: 'authorization_code',
        clientId: 'svc',
        audience: 'aud',
        scope: 'scope',
    },
    serviceAccountAuth: {
        method: 'client_credentials',
        clientId: 'svc',
        clientSecret: 'secret',
        audience: 'aud',
        scope: 'scope',
    },
}

const logger = pino({ level: 'silent' }, sink())

describe('resolveAutomationRunContext', () => {
    it('reuses a valid client-credentials session', async () => {
        const session = {
            id: 'session-1',
            network: 'net-m2m',
            accessToken: 'abc',
        }
        const scopedStore = { setSession: vi.fn() }
        const store = {
            getIdp: vi.fn().mockResolvedValue(idp),
            getNetwork: vi.fn().mockResolvedValue(m2mNetwork),
            withAuthContext: vi.fn().mockReturnValue(scopedStore),
        }

        const result = await resolveAutomationRunContext(
            store as never,
            'service_account',
            'net-m2m',
            logger
        )

        expect(result?.authContext).toEqual({
            userId: 'service_account',
            accessToken: session.accessToken,
        })
    })

    it('mints a token when no usable session exists', async () => {
        const scopedStore = { setSession: vi.fn() }
        const store = {
            getIdp: vi.fn().mockResolvedValue(idp),
            getNetwork: vi.fn().mockResolvedValue(m2mNetwork),
            withAuthContext: vi.fn().mockReturnValue(scopedStore),
        }

        const result = await resolveAutomationRunContext(
            store as never,
            'service_account',
            'net-m2m',
            logger
        )

        expect(result?.authContext.userId).toBe('service_account')
    })

    it('mints when the stored session is not a client-credentials token', async () => {
        const scopedStore = { setSession: vi.fn() }
        const store = {
            getIdp: vi.fn().mockResolvedValue(idp),
            getNetwork: vi.fn().mockResolvedValue(m2mNetwork),
            withAuthContext: vi.fn().mockReturnValue(scopedStore),
        }

        await resolveAutomationRunContext(
            store as never,
            'service_account',
            'net-m2m',
            logger
        )
    })
})
