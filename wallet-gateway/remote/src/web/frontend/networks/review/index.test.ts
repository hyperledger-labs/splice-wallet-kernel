// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { NetworkEditCancelEvent } from '@canton-network/core-wallet-ui-components'
import {
    createMockUserClient,
    makeNetwork,
    mockReviewNetworkFlow,
    mockRequest,
    networkDeleteEvent,
    networkEditSaveEvent,
    networkEditSaveEventFrom,
} from '../../test-helpers.js'

const { mockCreateUserClient, handleErrorToast, setLocationHref } = vi.hoisted(
    () => ({
        mockCreateUserClient: vi.fn(),
        handleErrorToast: vi.fn(),
        setLocationHref: vi.fn(),
    })
)

vi.mock('../../index.js', () => ({}))
vi.mock('../../navigation.js', () => ({ setLocationHref }))
vi.mock('../../rpc-client.js', () => ({
    createUserClient: mockCreateUserClient,
}))
vi.mock('../../state-manager.js', () => ({
    stateManager: {
        accessToken: { get: () => 'test-token' },
        currentOrigin: { get: vi.fn(), set: vi.fn(), clear: vi.fn() },
    },
}))
vi.mock('@canton-network/core-wallet-ui-components', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-wallet-ui-components')
        >()
    return { ...actual, handleErrorToast }
})

import './index.js'
import type { UserUiReviewNetwork } from './index.js'

describe('UserUiReviewNetwork', () => {
    let el: UserUiReviewNetwork
    const componentFixture = html`<user-ui-review-network></user-ui-review-network>`

    beforeEach(async () => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        handleErrorToast.mockReset()
        setLocationHref.mockReset()
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        mockReviewNetworkFlow({ id: 'net-review', name: 'Review Net' })
        history.replaceState({}, '', '?id=net-review')
        vi.stubGlobal(
            'confirm',
            vi.fn(() => true)
        )
        el = await fixture<UserUiReviewNetwork>(componentFixture)
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
        vi.unstubAllGlobals()
    })

    it('loads and renders the review form for the network in the URL', async () => {
        await waitUntil(() => el.network?.id === 'net-review')

        expect(el.shadowRoot?.querySelector('h1')?.textContent).toBe(
            'Review network'
        )
        expect(el.shadowRoot?.querySelector('network-form')).not.toBeNull()
    })

    it('calls addNetwork when the form is saved', async () => {
        await waitUntil(() => el.network !== null)

        el.shadowRoot
            ?.querySelector('network-form')
            ?.dispatchEvent(
                networkEditSaveEvent({ id: 'net-review', name: 'Review Net' })
            )

        await waitUntil(() =>
            mockRequest.mock.calls.some((c) => c[0]?.method === 'addNetwork')
        )

        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'addNetwork' })
        )
    })

    it('navigates back when the URL has no network id', async () => {
        history.replaceState({}, '', '?')
        el = await fixture<UserUiReviewNetwork>(componentFixture)

        await waitUntil(() => setLocationHref.mock.calls.length > 0)

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/networks')
        )
        expect(el.network).toBeNull()
        expect(el.shadowRoot?.querySelector('network-form')).toBeNull()
        expect(handleErrorToast).not.toHaveBeenCalled()
    })

    it('navigates back when the form emits network-edit-cancel', async () => {
        await waitUntil(() => el.network !== null)

        setLocationHref.mockClear()
        el.shadowRoot
            ?.querySelector('network-form')
            ?.dispatchEvent(new NetworkEditCancelEvent())

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/networks')
        )
    })

    it('calls removeNetwork when delete is confirmed', async () => {
        await waitUntil(() => el.network !== null)

        el.shadowRoot
            ?.querySelector('network-form')
            ?.dispatchEvent(
                networkDeleteEvent({ id: 'net-review', name: 'Review Net' })
            )

        await waitUntil(() =>
            mockRequest.mock.calls.some((c) => c[0]?.method === 'removeNetwork')
        )

        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'removeNetwork',
                params: { networkName: 'net-review' },
            })
        )
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/networks/')
        )
    })

    it('navigates back when the network is not found', async () => {
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getNetwork') {
                throw new Error('Network not found')
            }
            return undefined
        })
        history.replaceState({}, '', '?id=missing-net')
        el = await fixture<UserUiReviewNetwork>(componentFixture)

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/networks')
        )
        expect(el.network).toBeNull()
    })

    it('navigates back when loading networks fails', async () => {
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getNetwork') {
                throw new Error('list failed')
            }
            return undefined
        })
        history.replaceState({}, '', '?id=net-review')
        el = await fixture<UserUiReviewNetwork>(componentFixture)

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/networks')
        )
    })

    it('navigates to the list after a successful save', async () => {
        await waitUntil(() => el.network !== null)

        setLocationHref.mockClear()
        el.shadowRoot
            ?.querySelector('network-form')
            ?.dispatchEvent(
                networkEditSaveEvent({ id: 'net-review', name: 'Review Net' })
            )

        await waitUntil(() => setLocationHref.mock.calls.length > 0)

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/networks/')
        )
    })

    it('calls handleErrorToast when save fails', async () => {
        await waitUntil(() => el.network !== null)

        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getNetwork') {
                return {
                    network: makeNetwork({
                        id: 'net-review',
                        name: 'Review Net',
                    }),
                }
            }
            if (method === 'addNetwork') {
                throw new Error('save failed')
            }
            return undefined
        })

        el.shadowRoot
            ?.querySelector('network-form')
            ?.dispatchEvent(
                networkEditSaveEvent({ id: 'net-review', name: 'Review Net' })
            )

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
    })

    it('does not delete when confirmation is declined', async () => {
        await waitUntil(() => el.network !== null)
        vi.mocked(confirm).mockReturnValue(false)

        el.shadowRoot
            ?.querySelector('network-form')
            ?.dispatchEvent(
                networkDeleteEvent({ id: 'net-review', name: 'Review Net' })
            )

        expect(
            mockRequest.mock.calls.some((c) => c[0]?.method === 'removeNetwork')
        ).toBe(false)
    })

    it('calls handleErrorToast when delete fails', async () => {
        await waitUntil(() => el.network !== null)

        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'getNetwork') {
                return {
                    network: makeNetwork({
                        id: 'net-review',
                        name: 'Review Net',
                    }),
                }
            }
            if (method === 'removeNetwork') {
                throw new Error('delete failed')
            }
            return undefined
        })

        el.shadowRoot
            ?.querySelector('network-form')
            ?.dispatchEvent(
                networkDeleteEvent({ id: 'net-review', name: 'Review Net' })
            )

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
    })

    it('includes synchronizerId and adminAuth when saving a network', async () => {
        await waitUntil(() => el.network !== null)

        const network = makeNetwork({
            id: 'net-review',
            name: 'Review Net',
            synchronizerId: 'sync::456',
            adminAuth: {
                method: 'client_credentials',
                audience: 'admin-aud',
                scope: 'admin-scope',
                clientId: 'admin-client',
                clientSecret: 'admin-secret',
            },
        })

        el.shadowRoot
            ?.querySelector('network-form')
            ?.dispatchEvent(networkEditSaveEventFrom(network))

        await waitUntil(() =>
            mockRequest.mock.calls.some((c) => c[0]?.method === 'addNetwork')
        )

        expect(mockRequest).toHaveBeenCalledWith({
            method: 'addNetwork',
            params: {
                network: expect.objectContaining({
                    synchronizerId: 'sync::456',
                    adminAuth: expect.objectContaining({
                        clientId: 'admin-client',
                    }),
                }),
            },
        })
    })
})
