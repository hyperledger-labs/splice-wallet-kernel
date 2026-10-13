// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { WalletCreateEvent } from '@canton-network/core-wallet-ui-components'
import {
    createMockUserClient,
    makeWallet,
    mockRequest,
} from '../test-helpers.js'

const {
    mockCreateUserClient,
    handleErrorToast,
    showToast,
    shareUserSession,
    redirectToIntendedOrDefault,
    accessTokenSet,
    onboardingSessionIdGet,
    onboardingSessionIdClear,
} = vi.hoisted(() => ({
    mockCreateUserClient: vi.fn(),
    handleErrorToast: vi.fn(),
    showToast: vi.fn(),
    shareUserSession: vi.fn(),
    redirectToIntendedOrDefault: vi.fn(),
    accessTokenSet: vi.fn(),
    onboardingSessionIdGet: vi.fn(),
    onboardingSessionIdClear: vi.fn(),
}))

vi.mock('../rpc-client.js', () => ({
    createUserClient: mockCreateUserClient,
}))
vi.mock('../utils.js', () => ({ showToast }))
vi.mock('../index.js', () => ({
    shareUserSession,
    redirectToIntendedOrDefault,
}))
vi.mock('../state-manager.js', () => ({
    stateManager: {
        accessToken: { set: accessTokenSet },
        expirationDate: { set: vi.fn() },
        onboardingSessionId: {
            get: onboardingSessionIdGet,
            clear: onboardingSessionIdClear,
        },
    },
}))
vi.mock('../listeners.js', () => ({
    detectCurrentOrigin: vi.fn().mockResolvedValue('https://app.example'),
}))
vi.mock('@canton-network/core-wallet-ui-components', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-wallet-ui-components')
        >()
    return {
        ...actual,
        handleErrorToast,
    }
})

import './index.js'
import type { UserUiSelfIssuedOnboarding } from './index.js'

const accessToken = `header.${btoa(JSON.stringify({ exp: 2_000_000_000 }))}.sig`

describe('UserUiSelfIssuedOnboarding', () => {
    beforeEach(() => {
        onboardingSessionIdGet.mockReturnValue('onboarding-session-1')
        mockRequest.mockReset()
        mockCreateUserClient.mockReset()
        handleErrorToast.mockReset()
        showToast.mockReset()
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
    })

    afterEach(() => {
        document.body.innerHTML = ''
        vi.clearAllMocks()
    })

    it('renders the create-party form without the primary-wallet option', async () => {
        mockRequest.mockResolvedValue({
            userExists: false,
            primaryPartyAuth: false,
            wallets: [],
        })
        const element = await fixture<UserUiSelfIssuedOnboarding>(
            html`<user-ui-self-issued-onboarding></user-ui-self-issued-onboarding>`
        )

        await waitUntil(
            () =>
                element.shadowRoot?.querySelector('wg-wallet-create-form') !==
                null
        )
        const form = element.shadowRoot?.querySelector('wg-wallet-create-form')
        expect(form).not.toBeNull()
        expect(form?.shadowRoot?.querySelector('#primary')).toBeNull()
    })

    it('initializes and immediately finalizes an allocated party', async () => {
        const initializedWallet = makeWallet({
            partyId: 'alice::namespace',
            status: 'allocated',
        })
        mockRequest
            .mockResolvedValueOnce({
                userExists: false,
                primaryPartyAuth: false,
                wallets: [],
            })
            .mockResolvedValueOnce({ wallet: initializedWallet })
            .mockResolvedValueOnce({
                wallet: { ...initializedWallet, isAuthParty: true },
                accessToken,
                sessionId: 'onboarding-session-1',
            })

        const element = await fixture<UserUiSelfIssuedOnboarding>(
            html`<user-ui-self-issued-onboarding></user-ui-self-issued-onboarding>`
        )
        await waitUntil(
            () =>
                element.shadowRoot?.querySelector('wg-wallet-create-form') !==
                null
        )
        element.shadowRoot
            ?.querySelector('wg-wallet-create-form')
            ?.dispatchEvent(
                new WalletCreateEvent('auth-party', 'wallet-kernel', false)
            )

        await waitUntil(() => mockRequest.mock.calls.length === 3)

        expect(mockRequest).toHaveBeenNthCalledWith(1, {
            method: 'getSelfIssuedOnboarding',
            params: { sessionId: 'onboarding-session-1' },
        })
        expect(mockRequest).toHaveBeenNthCalledWith(2, {
            method: 'createSelfIssuedWallet',
            params: {
                sessionId: 'onboarding-session-1',
                partyHint: 'auth-party',
                signingProviderId: 'wallet-kernel',
            },
        })
        expect(mockRequest).toHaveBeenNthCalledWith(3, {
            method: 'connectSelfIssuedSession',
            params: {
                sessionId: 'onboarding-session-1',
                partyId: 'alice::namespace',
            },
        })
        await waitUntil(
            () => redirectToIntendedOrDefault.mock.calls.length === 1
        )
        expect(accessTokenSet).toHaveBeenCalledWith(
            accessToken,
            'https://app.example'
        )
        expect(onboardingSessionIdClear).toHaveBeenCalledWith(
            'https://app.example'
        )
        expect(shareUserSession).toHaveBeenCalledWith(
            accessToken,
            'onboarding-session-1',
            'https://app.example'
        )
    })

    it('lets the user finalize a pending external signing request', async () => {
        const pendingWallet = makeWallet({
            partyId: 'alice::namespace',
            status: 'initialized',
        })
        mockRequest
            .mockResolvedValueOnce({
                userExists: false,
                primaryPartyAuth: false,
                wallets: [],
            })
            .mockResolvedValueOnce({ wallet: pendingWallet })
            .mockResolvedValueOnce({
                wallet: {
                    ...pendingWallet,
                    status: 'allocated',
                },
            })
            .mockResolvedValueOnce({
                wallet: {
                    ...pendingWallet,
                    status: 'allocated',
                    isAuthParty: true,
                },
                accessToken,
                sessionId: 'onboarding-session-1',
            })

        const element = await fixture<UserUiSelfIssuedOnboarding>(
            html`<user-ui-self-issued-onboarding></user-ui-self-issued-onboarding>`
        )
        await waitUntil(
            () =>
                element.shadowRoot?.querySelector('wg-wallet-create-form') !==
                null
        )
        element.shadowRoot
            ?.querySelector('wg-wallet-create-form')
            ?.dispatchEvent(new WalletCreateEvent('auth-party', 'dfns', false))

        await waitUntil(
            () =>
                element.shadowRoot?.querySelector<HTMLButtonElement>(
                    '.status-actions button'
                ) !== null
        )
        element.shadowRoot
            ?.querySelector<HTMLButtonElement>('.status-actions button')
            ?.click()

        await waitUntil(() => mockRequest.mock.calls.length === 4)
        expect(mockRequest).toHaveBeenNthCalledWith(3, {
            method: 'allocateSelfIssuedWallet',
            params: {
                sessionId: 'onboarding-session-1',
                partyId: 'alice::namespace',
            },
        })
        expect(mockRequest).toHaveBeenNthCalledWith(4, {
            method: 'connectSelfIssuedSession',
            params: {
                sessionId: 'onboarding-session-1',
                partyId: 'alice::namespace',
            },
        })
    })

    it('shows stored authentication parties when primary party auth is set', async () => {
        mockRequest.mockResolvedValue({
            userExists: true,
            primaryPartyAuth: true,
            wallets: [makeWallet()],
        })

        const element = await fixture<UserUiSelfIssuedOnboarding>(
            html`<user-ui-self-issued-onboarding></user-ui-self-issued-onboarding>`
        )

        await waitUntil(
            () => element.shadowRoot?.querySelector('wg-wallet-card') !== null
        )
        expect(
            element.shadowRoot?.querySelector('wg-wallet-create-form')
        ).toBeNull()
    })

    it('shows an error when there is no onboarding session', async () => {
        onboardingSessionIdGet.mockReturnValue(undefined)

        const element = await fixture<UserUiSelfIssuedOnboarding>(
            html`<user-ui-self-issued-onboarding></user-ui-self-issued-onboarding>`
        )

        await waitUntil(
            () => element.shadowRoot?.querySelector('[role="alert"]') !== null
        )
        expect(
            element.shadowRoot?.querySelector('[role="alert"]')?.textContent
        ).toContain('No onboarding session found')
        expect(
            element.shadowRoot?.querySelector('wg-wallet-create-form')
        ).toBeNull()
        expect(mockRequest).not.toHaveBeenCalled()
    })
})
