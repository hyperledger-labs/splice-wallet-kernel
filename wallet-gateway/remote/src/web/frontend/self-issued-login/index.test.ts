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
    selfIssuedLoginSessionIdGet,
    selfIssuedLoginSessionIdClear,
    setLocationHref,
} = vi.hoisted(() => ({
    mockCreateUserClient: vi.fn(),
    handleErrorToast: vi.fn(),
    showToast: vi.fn(),
    shareUserSession: vi.fn(),
    redirectToIntendedOrDefault: vi.fn(),
    accessTokenSet: vi.fn(),
    selfIssuedLoginSessionIdGet: vi.fn(),
    selfIssuedLoginSessionIdClear: vi.fn(),
    setLocationHref: vi.fn(),
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
        selfIssuedLoginSessionId: {
            get: selfIssuedLoginSessionIdGet,
            clear: selfIssuedLoginSessionIdClear,
        },
    },
}))
vi.mock('../navigation.js', () => ({ setLocationHref }))
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
import type { UserUiSelfIssuedLogin } from './index.js'

const accessToken = `header.${btoa(JSON.stringify({ exp: 2_000_000_000 }))}.sig`

describe('UserUiSelfIssuedLogin', () => {
    beforeEach(() => {
        selfIssuedLoginSessionIdGet.mockReturnValue('onboarding-session-1')
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

    it('shows the create-party form, without a primary-wallet option, when login mode is create', async () => {
        mockRequest.mockResolvedValue({ mode: 'create' })
        const element = await fixture<UserUiSelfIssuedLogin>(
            html`<user-ui-self-issued-login></user-ui-self-issued-login>`
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

    it('completes login immediately when party creation returns an allocated wallet', async () => {
        const initializedWallet = makeWallet({
            partyId: 'alice::namespace',
            status: 'allocated',
        })
        mockRequest
            .mockResolvedValueOnce({ mode: 'create' })
            .mockResolvedValueOnce({ wallet: initializedWallet })
            .mockResolvedValueOnce({
                wallet: { ...initializedWallet, isAuthParty: true },
                accessToken,
                sessionId: 'onboarding-session-1',
            })

        const element = await fixture<UserUiSelfIssuedLogin>(
            html`<user-ui-self-issued-login></user-ui-self-issued-login>`
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
            method: 'getSelfIssuedLoginMode',
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
            method: 'completeSelfIssuedLogin',
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
        expect(selfIssuedLoginSessionIdClear).toHaveBeenCalledWith(
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
            .mockResolvedValueOnce({ mode: 'create' })
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

        const element = await fixture<UserUiSelfIssuedLogin>(
            html`<user-ui-self-issued-login></user-ui-self-issued-login>`
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
                    'button.btn-primary'
                ) !== null
        )
        element.shadowRoot
            ?.querySelector<HTMLButtonElement>('button.btn-primary')
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
            method: 'completeSelfIssuedLogin',
            params: {
                sessionId: 'onboarding-session-1',
                partyId: 'alice::namespace',
            },
        })
    })

    it('shows the primary-party wallet when login mode is select', async () => {
        mockRequest.mockResolvedValue({
            mode: 'select',
            wallet: makeWallet(),
        })

        const element = await fixture<UserUiSelfIssuedLogin>(
            html`<user-ui-self-issued-login></user-ui-self-issued-login>`
        )

        await waitUntil(
            () => element.shadowRoot?.querySelector('wg-wallet-card') !== null
        )
        expect(
            element.shadowRoot?.querySelector('wg-wallet-create-form')
        ).toBeNull()
    })

    it('shows an error when there is no onboarding session', async () => {
        selfIssuedLoginSessionIdGet.mockReturnValue(undefined)

        const element = await fixture<UserUiSelfIssuedLogin>(
            html`<user-ui-self-issued-login></user-ui-self-issued-login>`
        )

        await waitUntil(
            () => element.shadowRoot?.querySelector('[role="alert"]') !== null
        )
        expect(
            element.shadowRoot?.querySelector('[role="alert"]')?.textContent
        ).toContain('No self-issued login session found')
        expect(
            element.shadowRoot?.querySelector('wg-wallet-create-form')
        ).toBeNull()
        expect(mockRequest).not.toHaveBeenCalled()
    })

    it('shows the select view with an error when select mode has no wallet', async () => {
        mockRequest.mockResolvedValue({ mode: 'select' })

        const element = await fixture<UserUiSelfIssuedLogin>(
            html`<user-ui-self-issued-login></user-ui-self-issued-login>`
        )

        await waitUntil(
            () => element.shadowRoot?.querySelector('[role="alert"]') !== null
        )
        expect(element.shadowRoot?.querySelector('h1')?.textContent).toContain(
            'Select authentication party'
        )
        expect(
            element.shadowRoot
                ?.querySelector('[role="alert"]')
                ?.textContent?.replace(/\s+/g, ' ')
        ).toContain('No wallet was found for the authentication party.')
        expect(element.shadowRoot?.querySelector('wg-wallet-card')).toBeNull()
        expect(
            element.shadowRoot?.querySelector('wg-wallet-create-form')
        ).toBeNull()
        expect(
            element.shadowRoot?.querySelector('.page-header button')
        ).not.toBeNull()
    })

    it('removes the tokenless session and returns to login when Back is clicked', async () => {
        mockRequest.mockResolvedValue({ mode: 'create' })
        const element = await fixture<UserUiSelfIssuedLogin>(
            html`<user-ui-self-issued-login></user-ui-self-issued-login>`
        )

        await waitUntil(
            () =>
                element.shadowRoot?.querySelector('.page-header button') !==
                null
        )
        element.shadowRoot
            ?.querySelector<HTMLButtonElement>('.page-header button')
            ?.click()

        await waitUntil(() => setLocationHref.mock.calls.length === 1)
        expect(mockRequest).toHaveBeenLastCalledWith({
            method: 'removeSelfIssuedLoginSession',
            params: { sessionId: 'onboarding-session-1' },
        })
        expect(selfIssuedLoginSessionIdClear).toHaveBeenCalledWith(
            'https://app.example'
        )
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/login')
        )
    })
})
