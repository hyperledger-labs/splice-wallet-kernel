// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest'

vi.mock('uuid', () => ({ v4: vi.fn(() => 'session-new') }))

import { pino } from 'pino'
import { sink } from 'pino-test'
import type { Network } from '@canton-network/core-wallet-store'
import type { Idp } from '@canton-network/core-wallet-auth'
import {
    createServiceAccountRunContextResolver,
    resolveAutomationRunContext,
} from './service-account-session.js'

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

const pendingTransaction = {
    id: 'tx-1',
    commandId: 'cmd-1',
    status: 'pending' as const,
    preparedTransaction: 'blob',
    preparedTransactionHash: 'hash',
    externalTxId: 'ext-1',
    origin: null,
    userId: 'user-1',
    networkId: 'net-m2m',
}

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

describe('createServiceAccountRunContextResolver', () => {
    function setup(
        options: {
            network?: Network
            session?: { id: string } | undefined
        } = {}
    ) {
        const scopedStore = {
            getSession: vi
                .fn()
                .mockResolvedValue(
                    'session' in options ? options.session : { id: 'session-1' }
                ),
        }
        const store = {
            getIdp: vi.fn().mockResolvedValue(idp),
            getNetwork: vi
                .fn()
                .mockResolvedValue(options.network ?? m2mNetwork),
            withAuthContext: vi.fn().mockReturnValue(scopedStore),
        }
        const notifier = { emit: vi.fn() }
        const notificationService = {
            getNotifier: vi.fn().mockReturnValue(notifier),
        }
        const errorLogger = pino({ level: 'silent' }, sink())
        const error = vi.spyOn(errorLogger, 'error')

        const resolve = createServiceAccountRunContextResolver({
            store: store as never,
            notificationService,
            logger: errorLogger,
        })

        return {
            resolve,
            store,
            scopedStore,
            notifier,
            notificationService,
            error,
        }
    }

    it('returns the run context and the notifier for the session', async () => {
        const { resolve, scopedStore, notifier, notificationService } = setup()

        const result = await resolve(pendingTransaction)

        expect(scopedStore.getSession).toHaveBeenCalledWith('abc')
        expect(notificationService.getNotifier).toHaveBeenCalledWith(
            'session-1'
        )
        expect(result).toEqual({
            authContext: { userId: 'service_account', accessToken: 'abc' },
            store: scopedStore,
            network: m2mNetwork,
            notifier,
        })
    })

    it('returns undefined for a network without service-account auth', async () => {
        const { resolve, store, notificationService } = setup({
            network: { ...m2mNetwork, serviceAccountAuth: undefined },
        })

        const result = await resolve(pendingTransaction)

        expect(result).toBeUndefined()
        expect(store.withAuthContext).not.toHaveBeenCalled()
        expect(notificationService.getNotifier).not.toHaveBeenCalled()
    })

    it('returns undefined and logs an error when the session is missing', async () => {
        const { resolve, notificationService, error } = setup({
            session: undefined,
        })

        const result = await resolve(pendingTransaction)

        expect(result).toBeUndefined()
        expect(notificationService.getNotifier).not.toHaveBeenCalled()
        expect(error).toHaveBeenCalledWith(
            { userId: 'user-1', networkId: 'net-m2m', transactionId: 'tx-1' },
            'Signing worker tick failed: session not found'
        )
    })
})
