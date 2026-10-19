// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import {
    WalletCreateEvent,
    type WgWalletCreateForm,
} from '@canton-network/core-wallet-ui-components'
import {
    createMockUserClient,
    makeWallet,
    mockRequest,
} from '../../__tests__/test-helpers.js'

const {
    mockCreateUserClient,
    handleErrorToast,
    showToast,
    setLocationHref,
    mockNetworkIdGet,
} = vi.hoisted(() => ({
    mockCreateUserClient: vi.fn(),
    handleErrorToast: vi.fn(),
    showToast: vi.fn(),
    setLocationHref: vi.fn(),
    mockNetworkIdGet: vi.fn<() => string | undefined>(() => 'network1'),
}))

vi.mock('../../index.js', () => ({}))
vi.mock('../../navigation.js', () => ({ setLocationHref }))
vi.mock('../../utils.js', () => ({ showToast }))
vi.mock('../../rpc-client.js', () => ({
    createUserClient: mockCreateUserClient,
}))
vi.mock('../../state-manager.js', () => ({
    stateManager: {
        accessToken: { get: () => 'test-token' },
        networkId: { get: mockNetworkIdGet },
        currentOrigin: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
    },
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
import type { UserUiAddParty } from './index.js'
import { WALLET_STATUS_CODE } from '../index'
import type { Key } from '@canton-network/core-signing-lib'

type MockRequestHandler = (request: {
    method: string
    params?: unknown
}) => unknown

describe('UserUiAddParty', () => {
    let requestHandlers: Record<string, MockRequestHandler>
    const componentFixture = html`<user-ui-add-party></user-ui-add-party>`

    const renderElement = () => fixture<UserUiAddParty>(componentFixture)

    const getCreateForm = (el: UserUiAddParty) =>
        el.shadowRoot?.querySelector<WgWalletCreateForm>(
            'wg-wallet-create-form'
        )

    const getSigningProviderSelect = (el: UserUiAddParty) =>
        getCreateForm(el)?.shadowRoot?.querySelector<HTMLSelectElement>(
            '#signing-provider-id'
        )

    const waitForSigningProviders = (el: UserUiAddParty) =>
        waitUntil(() => {
            const form = getCreateForm(el)
            return Boolean(form && !form.signingProvidersLoading)
        })

    beforeEach(() => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        handleErrorToast.mockReset()
        showToast.mockReset()
        setLocationHref.mockReset()
        mockNetworkIdGet.mockReset()
        mockNetworkIdGet.mockReturnValue('network1')
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        requestHandlers = {
            listSigningProviders: async () => ({
                signingProviders: ['participant', 'wallet-kernel'],
            }),
            listSigningProviderKeys: async () => ({
                keys: [
                    { id: 'key-1', name: 'Vault A', publicKey: 'pk1' },
                    { id: 'key-2', name: 'Vault B', publicKey: 'pk2' },
                ],
            }),
        }
        mockRequest.mockImplementation(async (request) => {
            const handler = requestHandlers[request.method]
            if (!handler) {
                throw new Error(
                    `Unexpected User API request: ${request.method}`
                )
            }
            return handler(request)
        })
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
    })

    it('renders create party header and form', async () => {
        const el = await renderElement()

        expect(el.shadowRoot?.querySelector('h1')?.textContent).toBe(
            'Create a new party'
        )
        expect(getCreateForm(el)).not.toBeNull()
    })

    it('loads signing providers and passes the loading state to the form', async () => {
        let resolveSigningProviders!: (value: {
            signingProviders: string[]
        }) => void
        const signingProvidersDeferred = new Promise<{
            signingProviders: string[]
        }>((resolve) => {
            resolveSigningProviders = resolve
        })
        requestHandlers.listSigningProviders = () => signingProvidersDeferred

        const el = await renderElement()

        await waitUntil(() => {
            const form = getCreateForm(el)
            const providerSelect = getSigningProviderSelect(el)
            return (
                form?.signingProvidersLoading === true &&
                providerSelect?.disabled === true &&
                providerSelect.querySelector('option')?.textContent?.trim() ===
                    'Loading signing providers...'
            )
        })
        const form = getCreateForm(el)
        const providerSelect = getSigningProviderSelect(el)
        expect(form?.signingProvidersLoading).toBe(true)
        expect(providerSelect?.disabled).toBe(true)
        expect(
            providerSelect?.querySelector('option')?.textContent?.trim()
        ).toBe('Loading signing providers...')

        resolveSigningProviders({
            signingProviders: ['participant', 'fireblocks'],
        })

        await waitUntil(
            () =>
                getCreateForm(el)?.signingProvidersLoading === false &&
                Array.from(getSigningProviderSelect(el)?.options ?? []).some(
                    (option) => option.value === 'fireblocks'
                )
        )
        expect(form?.signingProvidersLoading).toBe(false)
        expect(form?.signingProviders).toEqual(['participant', 'fireblocks'])
        expect(mockRequest).toHaveBeenCalledWith({
            method: 'listSigningProviders',
        })
        expect(
            Array.from(getSigningProviderSelect(el)?.options ?? []).map(
                (option) => option.value
            )
        ).toEqual(['', 'participant', 'fireblocks'])
    })

    it('navigates back to parties list when Back is clicked', async () => {
        const el = await renderElement()
        await waitForSigningProviders(el)

        const backBtn = el.shadowRoot?.querySelector(
            '.page-header button'
        ) as HTMLButtonElement
        backBtn.click()

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/parties')
        )
    })

    it('redirects to parties with allocated status after successful create', async () => {
        requestHandlers.createWallet = async () => ({
            wallet: makeWallet({ status: 'allocated' }),
        })

        const el = await renderElement()
        await waitForSigningProviders(el)

        getCreateForm(el)!.dispatchEvent(
            new WalletCreateEvent('my-party', 'participant', true)
        )

        await waitUntil(() => setLocationHref.mock.calls.length > 0)

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(
                `createPartyStatus=${WALLET_STATUS_CODE.WALLET_ALLOCATED}`
            )
        )
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/parties/')
        )
    })

    it('redirects with initialized status when wallet is not yet allocated', async () => {
        requestHandlers.createWallet = async () => ({
            wallet: makeWallet({ status: 'initialized' }),
        })

        const el = await renderElement()
        await waitForSigningProviders(el)

        getCreateForm(el)!.dispatchEvent(
            new WalletCreateEvent('pending-party', 'participant', false)
        )

        await waitUntil(() => setLocationHref.mock.calls.length > 0)

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(WALLET_STATUS_CODE.WALLET_INITIALIZED)
        )
    })

    it('calls handleErrorToast and clears loading when createWallet fails', async () => {
        requestHandlers.createWallet = async () => {
            throw new Error('create failed')
        }

        const el = await renderElement()
        await waitForSigningProviders(el)

        getCreateForm(el)!.dispatchEvent(
            new WalletCreateEvent('fail-party', 'participant', false)
        )

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
    })

    it('redirects with removed status when wallet creation is rejected', async () => {
        requestHandlers.createWallet = async () => ({
            wallet: makeWallet({ status: 'removed' }),
        })

        const el = await renderElement()
        await waitForSigningProviders(el)

        getCreateForm(el)!.dispatchEvent(
            new WalletCreateEvent('removed-party', 'participant', false)
        )

        await waitUntil(() => setLocationHref.mock.calls.length > 0)

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(
                `createPartyStatus=${WALLET_STATUS_CODE.WALLET_REMOVED}`
            )
        )
    })

    it('loads keys when a vault enabled signing provider is selected and sorts alphabetically', async () => {
        let resolveKeys!: (value: { keys: Array<Key> }) => void
        const keysDeferred = new Promise<{ keys: Array<Key> }>((resolve) => {
            resolveKeys = resolve
        })
        requestHandlers.listSigningProviders = async () => ({
            signingProviders: ['participant', 'wallet-kernel', 'fireblocks'],
        })
        requestHandlers.listSigningProviderKeys = () => keysDeferred

        const el = await renderElement()
        await waitForSigningProviders(el)
        await waitUntil(() =>
            Array.from(getSigningProviderSelect(el)?.options ?? []).some(
                (option) => option.value === 'fireblocks'
            )
        )
        const form = getCreateForm(el)
        const providerSelect =
            form?.shadowRoot?.querySelector<HTMLSelectElement>(
                '#signing-provider-id'
            )
        providerSelect!.value = 'fireblocks'
        providerSelect!.dispatchEvent(new Event('change', { bubbles: true }))

        await waitUntil(() => form?.publicKeysLoading === true)

        resolveKeys({
            keys: [
                { id: 'key-2', name: 'Vault B', publicKey: 'pk2' },
                { id: 'key-1', name: 'Vault A', publicKey: 'pk1' },
            ],
        })

        await waitUntil(() => form?.publicKeysLoading === false)
        expect(form?.publicKeys.map((key) => key.name)).toEqual([
            'Vault A',
            'Vault B',
        ])
        expect(mockRequest).toHaveBeenCalledWith({
            method: 'listSigningProviderKeys',
            params: { signingProviderId: 'fireblocks' },
        })
    })

    it('shows a toast when no vault accounts are returned', async () => {
        requestHandlers.listSigningProviders = async () => ({
            signingProviders: ['participant', 'wallet-kernel', 'fireblocks'],
        })
        requestHandlers.listSigningProviderKeys = async () => ({ keys: [] })

        const el = await renderElement()
        await waitForSigningProviders(el)
        await waitUntil(() =>
            Array.from(getSigningProviderSelect(el)?.options ?? []).some(
                (option) => option.value === 'fireblocks'
            )
        )
        const form = getCreateForm(el)
        const providerSelect =
            form?.shadowRoot?.querySelector<HTMLSelectElement>(
                '#signing-provider-id'
            )
        providerSelect!.value = 'fireblocks'
        providerSelect!.dispatchEvent(new Event('change', { bubbles: true }))

        await waitUntil(() => showToast.mock.calls.length > 0)

        expect(showToast).toHaveBeenCalledWith(
            'No public keys found',
            'No public keys are available for the selected signing provider.',
            'info'
        )
        expect(form?.publicKeys).toEqual([])
    })
})
