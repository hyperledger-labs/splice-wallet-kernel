// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import {
    createMockUserClient,
    makeNetwork,
    mockNetworksPageFlow,
    mockRequest,
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
import type { UserUiAddNetwork } from './index.js'

describe('UserUiAddNetwork', () => {
    let el: UserUiAddNetwork
    const componentFixture = html`<user-ui-add-network></user-ui-add-network>`

    beforeEach(async () => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        handleErrorToast.mockReset()
        setLocationHref.mockReset()
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        mockNetworksPageFlow([])
        el = await fixture<UserUiAddNetwork>(componentFixture)
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
    })

    it('renders the add-network form', () => {
        expect(el.shadowRoot?.querySelector('h1')?.textContent).toBe(
            'Add a new network'
        )
        expect(el.shadowRoot?.querySelector('network-form')).not.toBeNull()
    })

    it('calls addNetwork when the form is saved', async () => {
        const form = el.shadowRoot?.querySelector('network-form')
        form?.dispatchEvent(networkEditSaveEvent())

        await waitUntil(() =>
            mockRequest.mock.calls.some((c) => c[0]?.method === 'addNetwork')
        )

        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'addNetwork' })
        )
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/networks/')
        )
    })

    it('navigates back when Back is clicked', () => {
        const backBtn = el.shadowRoot?.querySelector(
            '.page-header button'
        ) as HTMLButtonElement
        backBtn.click()

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/networks')
        )
    })

    it('calls handleErrorToast and clears loading when addNetwork fails', async () => {
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'addNetwork') {
                throw new Error('add failed')
            }
            return undefined
        })

        el.loading = true
        el.shadowRoot
            ?.querySelector('network-form')
            ?.dispatchEvent(networkEditSaveEvent())

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
        expect(el.loading).toBe(false)
        expect(setLocationHref).not.toHaveBeenCalled()
    })

    it('includes synchronizerId and adminAuth when saving a network', async () => {
        const network = makeNetwork({
            synchronizerId: 'sync::123',
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
                    synchronizerId: 'sync::123',
                    adminAuth: expect.objectContaining({
                        clientId: 'admin-client',
                    }),
                }),
            },
        })
    })
})
