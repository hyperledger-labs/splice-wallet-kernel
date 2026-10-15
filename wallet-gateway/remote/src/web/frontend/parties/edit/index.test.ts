// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { WalletEditEvent } from '@canton-network/core-wallet-ui-components'
import {
    createMockUserClient,
    makeWallet,
    mockRequest,
} from '../../test-helpers.js'

const {
    mockCreateUserClient,
    handleErrorToast,
    setLocationHref,
    mockNetworkIdGet,
} = vi.hoisted(() => ({
    mockCreateUserClient: vi.fn(),
    handleErrorToast: vi.fn(),
    setLocationHref: vi.fn(),
    mockNetworkIdGet: vi.fn<() => string | undefined>(() => 'network1'),
}))

vi.mock('../../index.js', () => ({}))
vi.mock('../../navigation.js', () => ({ setLocationHref }))
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
import { UserUiEditParty } from './index.js'
import { WALLET_STATUS_CODE } from '../index.js'

describe('UserUiEditParty', () => {
    let el: UserUiEditParty
    let urlSearchParamsGetMock: ReturnType<typeof vi.spyOn>
    const partyId = 'alice::1220abc'

    const componentFixture = html`<user-ui-edit-party></user-ui-edit-party>`

    beforeEach(async () => {
        urlSearchParamsGetMock = vi
            .spyOn(URLSearchParams.prototype, 'get')
            .mockImplementation((paramName: string) => {
                if (paramName === 'partyId') return partyId
                return null
            })

        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        handleErrorToast.mockReset()
        setLocationHref.mockReset()
        mockNetworkIdGet.mockReset()
        mockNetworkIdGet.mockReturnValue('network1')

        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getWallet') {
                return makeWallet({
                    partyId,
                    networkId: 'network1',
                    signingProviderId: 'participant',
                    publicKey: 'old-pk',
                })
            }
            if (method === 'listSigningProviders') {
                return {
                    signingProviders: ['participant', 'fireblocks'],
                }
            }
            if (method === 'listSigningProviderKeys') {
                return { keys: [] }
            }
            return undefined
        })

        el = await fixture<UserUiEditParty>(componentFixture)
        await waitUntil(() => el.wallet !== undefined)
    })

    afterEach(() => {
        urlSearchParamsGetMock.mockRestore()
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
    })

    it('renders edit party header and form', async () => {
        expect(el.shadowRoot?.querySelector('h1')?.textContent).toBe(
            'Edit party'
        )
        expect(
            el.shadowRoot?.querySelector('wg-wallet-edit-form')
        ).not.toBeNull()
    })

    it('loads existing wallet on initialization', async () => {
        expect(mockRequest).toHaveBeenCalledWith({
            method: 'getWallet',
            params: { partyId },
        })
        expect(el.wallet).toBeDefined()
        expect(el.wallet.partyId).toBe(partyId)
    })

    it('displays existing signing provider and public key', async () => {
        expect(el.selectedSigningProvider).toBe('participant')
    })

    it('navigates back to parties list when Back is clicked', async () => {
        const backBtn = el.shadowRoot?.querySelector(
            '.page-header button'
        ) as HTMLButtonElement
        backBtn.click()

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/parties')
        )
    })

    it('calls changeSigningProvider when form emits wallet-edit event', async () => {
        const form = el.shadowRoot?.querySelector('wg-wallet-edit-form')
        const editEvent = new WalletEditEvent(
            partyId,
            'fireblocks',
            'new-vault-name'
        )
        form!.dispatchEvent(editEvent)

        await waitUntil(() =>
            mockRequest.mock.calls.some(
                ([request]) => request.method === 'changeSigningProvider'
            )
        )

        expect(mockRequest).toHaveBeenCalledWith({
            method: 'changeSigningProvider',
            params: {
                signingProviderId: 'fireblocks',
                partyId,
                publicKey: 'new-vault-name',
            },
        })
    })

    it('redirects to parties with status after successful edit', async () => {
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getWallet') {
                return makeWallet({ status: 'allocated' })
            }
            if (method === 'changeSigningProvider') {
                return {}
            }
            if (method === 'listSigningProviders') {
                return {
                    signingProviders: ['participant', 'fireblocks'],
                }
            }
            return undefined
        })

        // Reinitialize with fresh mockRequest
        el = await fixture<UserUiEditParty>(componentFixture)
        await waitUntil(() => el.wallet !== undefined)

        const form = el.shadowRoot?.querySelector('wg-wallet-edit-form')
        form!.dispatchEvent(new WalletEditEvent(partyId, 'fireblocks', 'vault'))

        await waitUntil(() => setLocationHref.mock.calls.length > 0)

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining(
                `createPartyStatus=${WALLET_STATUS_CODE.WALLET_EDITED}`
            )
        )
    })

    it('calls handleErrorToast and clears loading when changeSigningProvider fails', async () => {
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getWallet') {
                return makeWallet()
            }
            if (method === 'changeSigningProvider') {
                throw new Error('change failed')
            }
            if (method === 'listSigningProviders') {
                return {
                    signingProviders: ['participant', 'fireblocks'],
                }
            }
            return undefined
        })

        el = await fixture<UserUiEditParty>(componentFixture)
        await waitUntil(() => el.wallet !== undefined)

        const form = el.shadowRoot?.querySelector('wg-wallet-edit-form')
        form!.dispatchEvent(new WalletEditEvent(partyId, 'fireblocks', 'vault'))

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
    })

    it('throws error when partyId query param is missing', async () => {
        urlSearchParamsGetMock.mockImplementation(() => null)

        const partyIdGetter = Object.getOwnPropertyDescriptor(
            UserUiEditParty.prototype,
            'partyId'
        )?.get

        if (!partyIdGetter) {
            throw new Error('partyId getter not found')
        }

        expect(() => partyIdGetter.call(new UserUiEditParty())).toThrow(
            'partyId query param must be provided'
        )
    })
})
