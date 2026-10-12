// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { PageChangeEvent } from '@canton-network/core-wallet-ui-components'
import {
    createMockUserClient,
    makePublicNetwork,
    mockNetworksPageFlow,
    mockRequest,
} from '../test-helpers.js'

const { mockCreateUserClient, handleErrorToast } = vi.hoisted(() => ({
    mockCreateUserClient: vi.fn(),
    handleErrorToast: vi.fn(),
}))

vi.mock('../index.js', () => ({}))
vi.mock('../rpc-client.js', () => ({
    createUserClient: mockCreateUserClient,
}))
vi.mock('../state-manager.js', () => ({
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
import type { UserUiNetworks } from './index.js'

function getNetworkCards(el: UserUiNetworks) {
    return Array.from(
        el.shadowRoot?.querySelectorAll('network-card') ?? []
    ) as unknown as Array<{
        network: { id: string }
        activeSession: boolean
    }>
}

function makeNetworks(count: number) {
    return Array.from({ length: count }, (_, i) =>
        makePublicNetwork({ id: `net-${i + 1}`, name: `Network ${i + 1}` })
    )
}

describe('UserUiNetworks', () => {
    let el: UserUiNetworks
    const componentFixture = html`<user-ui-networks></user-ui-networks>`

    beforeEach(() => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        handleErrorToast.mockReset()
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
    })

    it('renders network cards after loading', async () => {
        mockNetworksPageFlow([
            makePublicNetwork(),
            makePublicNetwork({ id: 'net-2' }),
        ])

        el = await fixture<UserUiNetworks>(componentFixture)

        await waitUntil(() => getNetworkCards(el).length === 2)

        expect(el.shadowRoot?.querySelector('h1')?.textContent).toBe('Networks')
        expect(getNetworkCards(el)).toHaveLength(2)
    })

    it('shows empty state when there are no networks', async () => {
        mockNetworksPageFlow([])

        el = await fixture<UserUiNetworks>(componentFixture)

        await waitUntil(() =>
            el.shadowRoot?.textContent?.includes('No networks configured')
        )

        expect(el.shadowRoot?.querySelectorAll('network-card').length).toBe(0)
    })

    it('shows the add button for admin users', async () => {
        mockNetworksPageFlow([makePublicNetwork()], { isAdmin: true })

        el = await fixture<UserUiNetworks>(componentFixture)

        await waitUntil(() => getNetworkCards(el).length === 1)

        expect(el.shadowRoot?.querySelector('.btn-add')).not.toBeNull()
    })

    it('hides the add button for non-admin users', async () => {
        mockNetworksPageFlow([makePublicNetwork()], { isAdmin: false })

        el = await fixture<UserUiNetworks>(componentFixture)

        await waitUntil(() => getNetworkCards(el).length === 1)

        expect(el.shadowRoot?.querySelector('.btn-add')).toBeNull()
    })

    it('marks a network connected only when session status is connected', async () => {
        const network = makePublicNetwork({ id: 'net-1' })
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'listNetworks') {
                return { networks: [network] }
            }
            if (method === 'listSessions') {
                return {
                    sessions: [
                        {
                            id: 'sess-1',
                            network: { id: 'net-1' },
                            status: 'disconnected',
                            accessToken: 'token',
                        },
                    ],
                }
            }
            if (method === 'getUser') {
                return { userId: 'user-1', isAdmin: false }
            }
            return undefined
        })

        el = await fixture<UserUiNetworks>(componentFixture)

        await waitUntil(() => getNetworkCards(el).length === 1)

        expect(getNetworkCards(el)[0]?.activeSession).toBe(false)
    })

    it('paginates networks on the first page', async () => {
        mockNetworksPageFlow(makeNetworks(4))

        el = await fixture<UserUiNetworks>(componentFixture)

        await waitUntil(() => el.networks.length === 4)

        expect(el.shadowRoot?.querySelector('wg-pagination')).not.toBeNull()
        expect(getNetworkCards(el).map((c) => c.network.id)).toEqual([
            'net-1',
            'net-2',
            'net-3',
        ])
    })

    it('updates rendered cards when pagination changes page', async () => {
        mockNetworksPageFlow(makeNetworks(4))

        el = await fixture<UserUiNetworks>(componentFixture)
        await waitUntil(() => el.networks.length === 4)

        const pagination = el.shadowRoot?.querySelector('wg-pagination') as
            (HTMLElement & { page: number }) | null
        pagination?.dispatchEvent(new PageChangeEvent(2))

        await waitUntil(() => getNetworkCards(el)[0]?.network.id === 'net-4')

        expect(pagination?.page).toBe(2)
        expect(getNetworkCards(el)).toHaveLength(1)
        expect(getNetworkCards(el)[0]?.network.id).toBe('net-4')
    })
})
