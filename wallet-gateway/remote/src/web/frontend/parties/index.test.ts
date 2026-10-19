// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import {
    WalletAllocateEvent,
    WalletSetPrimaryEvent,
} from '@canton-network/core-wallet-ui-components'
import {
    createMockUserClient,
    makeWallet,
    mockListWalletsFlow,
    mockRequest,
} from '../__tests__/test-helpers.js'

const { mockCreateUserClient, showToast, handleErrorToast, setLocationHref } =
    vi.hoisted(() => ({
        mockCreateUserClient: vi.fn(),
        showToast: vi.fn(),
        handleErrorToast: vi.fn(),
        setLocationHref: vi.fn(),
    }))

vi.mock('../index.js', () => ({}))
vi.mock('../navigation.js', () => ({ setLocationHref }))
vi.mock('../rpc-client.js', () => ({
    createUserClient: mockCreateUserClient,
}))
vi.mock('../state-manager.js', () => ({
    stateManager: {
        accessToken: { get: () => 'test-token' },
        networkId: { get: () => 'network1' },
        currentOrigin: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
    },
}))
vi.mock('../utils.js', () => ({ showToast }))
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
import { type UserUiParties, WALLET_STATUS_CODE } from './index.js'

describe('UserUiParties', () => {
    let el: UserUiParties
    const componentFixture = html`<user-ui-parties></user-ui-parties>`

    beforeEach(async () => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        showToast.mockReset()
        handleErrorToast.mockReset()
        setLocationHref.mockReset()
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        mockListWalletsFlow([
            makeWallet({
                partyId: 'init::ns',
                status: 'initialized',
            }),
            makeWallet({
                partyId: 'alloc::ns',
                status: 'allocated',
                primary: true,
            }),
        ])
        history.replaceState({}, '', '/parties')
        el = await fixture<UserUiParties>(componentFixture)
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
    })

    it('renders parties header and wallet cards after loading wallets', async () => {
        await waitUntil(
            () => el.wallets !== undefined && el.wallets.length === 2,
            'wallets loaded'
        )

        expect(el.shadowRoot?.querySelector('h1')?.textContent).toBe('Parties')
        expect(el.shadowRoot?.querySelectorAll('wg-wallet-card').length).toBe(2)
    })

    it('navigates to add party page when New is clicked', async () => {
        await waitUntil(() => el.client !== null)

        const newBtn = el.shadowRoot?.querySelector(
            '.btn-add'
        ) as HTMLButtonElement
        newBtn.click()

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/parties/add/')
        )
    })

    it('shows success toast and clears createPartyStatus from URL when allocated', async () => {
        history.replaceState({}, '', '?createPartyStatus=1')
        const replaceState = vi.spyOn(history, 'replaceState')

        el = await fixture<UserUiParties>(componentFixture)

        expect(showToast).toHaveBeenCalledWith(
            'Party created',
            'Your new party has been created successfully.',
            'success'
        )
        expect(replaceState).toHaveBeenCalled()
        replaceState.mockRestore()
    })

    it('shows info toast for WALLET_INITIALIZED status param', async () => {
        history.replaceState(
            {},
            '',
            `?createPartyStatus=${WALLET_STATUS_CODE.WALLET_INITIALIZED}`
        )

        el = await fixture<UserUiParties>(componentFixture)

        expect(showToast).toHaveBeenCalledWith(
            'Party creation pending',
            expect.stringContaining('Allocate'),
            'info'
        )
    })

    it('calls setPrimaryWallet when wallet-set-primary is dispatched', async () => {
        await waitUntil(() => el.wallets !== undefined)

        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'listSessions') {
                return { sessions: [{ id: 's', network: { id: 'network1' } }] }
            }
            if (method === 'listWallets') {
                return el.wallets
            }
            if (method === 'setPrimaryWallet') {
                return undefined
            }
            return undefined
        })

        const wallet = makeWallet({ partyId: 'bob::ns', status: 'allocated' })
        const cards = el.shadowRoot?.querySelectorAll('wg-wallet-card')
        cards![1]!.dispatchEvent(new WalletSetPrimaryEvent(wallet))

        await waitUntil(() =>
            mockRequest.mock.calls.some(
                (c) => c[0]?.method === 'setPrimaryWallet'
            )
        )

        expect(mockRequest).toHaveBeenCalledWith({
            method: 'setPrimaryWallet',
            params: { partyId: 'bob::ns' },
        })
    })

    it('shows success toast when allocatePartyForWallet returns allocated', async () => {
        await waitUntil(() => el.client !== null)

        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'listSessions') {
                return { sessions: [{ id: 's', network: { id: 'network1' } }] }
            }
            if (method === 'listWallets') {
                return []
            }
            if (method === 'allocatePartyForWallet') {
                return {
                    wallet: makeWallet({ status: 'allocated' }),
                }
            }
            return undefined
        })

        const wallet = makeWallet({ status: 'initialized' })
        const card = el.shadowRoot?.querySelector('wg-wallet-card')
        card!.dispatchEvent(new WalletAllocateEvent(wallet))

        await waitUntil(() => showToast.mock.calls.length > 0)

        expect(showToast).toHaveBeenCalledWith(
            'Party allocated',
            'Party has been successfully allocated.',
            'success'
        )
        expect(el.loading).toBe(false)
    })

    it('calls handleErrorToast when allocatePartyForWallet fails', async () => {
        await waitUntil(() => el.client !== null)

        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'listSessions') {
                return { sessions: [{ id: 's', network: { id: 'network1' } }] }
            }
            if (method === 'listWallets') {
                return []
            }
            if (method === 'allocatePartyForWallet') {
                throw new Error('allocate failed')
            }
            return undefined
        })

        const card = el.shadowRoot?.querySelector('wg-wallet-card')
        card!.dispatchEvent(new WalletAllocateEvent(makeWallet()))

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
        expect(el.loading).toBe(false)
    })

    it('shows error toast for WALLET_REMOVED status param', async () => {
        history.replaceState(
            {},
            '',
            `?createPartyStatus=${WALLET_STATUS_CODE.WALLET_REMOVED}`
        )

        el = await fixture<UserUiParties>(componentFixture)

        expect(showToast).toHaveBeenCalledWith(
            'Party creation rejected',
            expect.stringContaining('unsuccessful'),
            'error'
        )
    })

    it('does not show a creation toast when createPartyStatus is absent', async () => {
        history.replaceState({}, '', '/parties')

        el = await fixture<UserUiParties>(componentFixture)

        expect(showToast).not.toHaveBeenCalled()
    })

    it('shows removed toast when allocatePartyForWallet returns removed', async () => {
        await waitUntil(() => el.client !== null)

        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'listSessions') {
                return { sessions: [{ id: 's', network: { id: 'network1' } }] }
            }
            if (method === 'listWallets') {
                return [makeWallet({ status: 'initialized' })]
            }
            if (method === 'allocatePartyForWallet') {
                return { wallet: makeWallet({ status: 'removed' }) }
            }
            return undefined
        })

        const card = el.shadowRoot?.querySelector('wg-wallet-card')
        card!.dispatchEvent(new WalletAllocateEvent(makeWallet()))

        await waitUntil(() => showToast.mock.calls.length > 0)

        expect(showToast).toHaveBeenCalledWith(
            'Party removed',
            expect.stringContaining('unsuccessful'),
            'error'
        )
    })

    it('shows pending toast when allocatePartyForWallet returns initialized', async () => {
        await waitUntil(() => el.client !== null)

        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'listSessions') {
                return { sessions: [{ id: 's', network: { id: 'network1' } }] }
            }
            if (method === 'listWallets') {
                return [makeWallet({ status: 'initialized' })]
            }
            if (method === 'allocatePartyForWallet') {
                return { wallet: makeWallet({ status: 'initialized' }) }
            }
            return undefined
        })

        const card = el.shadowRoot?.querySelector('wg-wallet-card')
        card!.dispatchEvent(new WalletAllocateEvent(makeWallet()))

        await waitUntil(() => showToast.mock.calls.length > 0)

        expect(showToast).toHaveBeenCalledWith(
            'Transaction pending',
            expect.stringContaining('signing provider'),
            'info'
        )
    })

    it('loads wallets using networkId from stateManager when listSessions fails', async () => {
        mockRequest.mockImplementation(async ({ method, params }) => {
            if (method === 'listSessions') {
                throw new Error('sessions unavailable')
            }
            if (method === 'listWallets') {
                expect(params).toEqual({ filter: { networkIds: ['network1'] } })
                return [makeWallet({ partyId: 'bob::ns', status: 'allocated' })]
            }
            return undefined
        })

        el = await fixture<UserUiParties>(componentFixture)

        await waitUntil(() => el.wallets?.length === 1)

        expect(el.wallets![0]!.partyId).toBe('bob::ns')
    })

    it('reloads wallets when sync-success event is dispatched', async () => {
        await waitUntil(() => el.wallets !== undefined)

        const initialCallCount = mockRequest.mock.calls.filter(
            (c) => c[0]?.method === 'listWallets'
        ).length

        el.shadowRoot
            ?.querySelector('wg-wallets-sync')
            ?.dispatchEvent(new Event('sync-success'))

        await waitUntil(
            () =>
                mockRequest.mock.calls.filter(
                    (c) => c[0]?.method === 'listWallets'
                ).length > initialCallCount
        )
    })
})
