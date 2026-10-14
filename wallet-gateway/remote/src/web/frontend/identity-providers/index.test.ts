// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { PageChangeEvent } from '@canton-network/core-wallet-ui-components'
import {
    createMockUserClient,
    makeIdp,
    mockIdpsPageFlow,
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
import type { UserUiIdentityProviders } from './index.js'

function getIdpCards(el: UserUiIdentityProviders) {
    return Array.from(
        el.shadowRoot?.querySelectorAll('idp-card') ?? []
    ) as unknown as Array<{ idp: { id: string } }>
}

function makeIdps(count: number) {
    return Array.from({ length: count }, (_, i) =>
        makeIdp({ id: `idp-${i + 1}` })
    )
}

describe('UserUiIdentityProviders', () => {
    let el: UserUiIdentityProviders
    const componentFixture = html`<user-ui-identity-providers></user-ui-identity-providers>`

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

    it('renders identity provider cards after loading', async () => {
        mockIdpsPageFlow([makeIdp(), makeIdp({ id: 'idp-2' })])

        el = await fixture<UserUiIdentityProviders>(componentFixture)

        await waitUntil(() => getIdpCards(el).length === 2)

        expect(el.shadowRoot?.querySelector('h1')?.textContent).toBe(
            'Identity Providers'
        )
        expect(getIdpCards(el)).toHaveLength(2)
    })

    it('shows empty state when there are no identity providers', async () => {
        mockIdpsPageFlow([])

        el = await fixture<UserUiIdentityProviders>(componentFixture)

        await waitUntil(() =>
            el.shadowRoot?.textContent?.includes(
                'No identity providers configured'
            )
        )

        expect(el.shadowRoot?.querySelectorAll('idp-card').length).toBe(0)
    })

    it('paginates identity providers on the first page', async () => {
        mockIdpsPageFlow(makeIdps(5))

        el = await fixture<UserUiIdentityProviders>(componentFixture)

        await waitUntil(() => el.idps.length === 5)

        expect(el.shadowRoot?.querySelector('wg-pagination')).not.toBeNull()
        expect(getIdpCards(el)).toHaveLength(4)
        expect(getIdpCards(el).map((c) => c.idp.id)).toEqual([
            'idp-1',
            'idp-2',
            'idp-3',
            'idp-4',
        ])
    })

    it('updates rendered cards when pagination changes page', async () => {
        mockIdpsPageFlow(makeIdps(5))

        el = await fixture<UserUiIdentityProviders>(componentFixture)
        await waitUntil(() => el.idps.length === 5)

        const pagination = el.shadowRoot?.querySelector('wg-pagination') as
            (HTMLElement & { page: number }) | null
        pagination?.dispatchEvent(new PageChangeEvent(2))

        await waitUntil(() => getIdpCards(el)[0]?.idp.id === 'idp-5')

        expect(pagination?.page).toBe(2)
        expect(getIdpCards(el)).toHaveLength(1)
        expect(getIdpCards(el)[0]?.idp.id).toBe('idp-5')
    })
})
