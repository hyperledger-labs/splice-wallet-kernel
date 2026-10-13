// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { PageChangeEvent } from '@canton-network/core-wallet-ui-components'
import {
    createMockUserClient,
    makeApiKey,
    mockApiKeysPageFlow,
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
import type { UserUiApiKeys } from './index.js'

function getApiKeyCards(el: UserUiApiKeys) {
    return Array.from(
        el.shadowRoot?.querySelectorAll('api-key-card') ?? []
    ) as unknown as Array<{ apiKey: { id: string } }>
}

function makeApiKeys(count: number) {
    return Array.from({ length: count }, (_, i) =>
        makeApiKey({ id: `api-key-${i + 1}`, name: `API Key ${i + 1}` })
    )
}

describe('UserUiApiKeys', () => {
    let el: UserUiApiKeys
    const componentFixture = html`<user-ui-api-keys></user-ui-api-keys>`

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

    it('renders API key cards after loading', async () => {
        mockApiKeysPageFlow([makeApiKey(), makeApiKey({ id: 'api-key-2' })])

        el = await fixture<UserUiApiKeys>(componentFixture)

        await waitUntil(() => getApiKeyCards(el).length === 2)

        expect(el.shadowRoot?.querySelector('h1')?.textContent).toBe('API Keys')
        expect(getApiKeyCards(el)).toHaveLength(2)
    })

    it('shows empty state when there are no API keys', async () => {
        mockApiKeysPageFlow([])

        el = await fixture<UserUiApiKeys>(componentFixture)

        await waitUntil(() =>
            el.shadowRoot?.textContent?.includes('No API keys configured')
        )

        expect(el.shadowRoot?.querySelectorAll('api-key-card').length).toBe(0)
    })

    it('shows the add button', async () => {
        mockApiKeysPageFlow([makeApiKey()])

        el = await fixture<UserUiApiKeys>(componentFixture)

        await waitUntil(() => getApiKeyCards(el).length === 1)

        expect(el.shadowRoot?.querySelector('.btn-add')).not.toBeNull()
    })

    it('paginates API keys on the first page', async () => {
        mockApiKeysPageFlow(makeApiKeys(6))

        el = await fixture<UserUiApiKeys>(componentFixture)

        await waitUntil(() => el.apiKeys.length === 6)

        expect(el.shadowRoot?.querySelector('wg-pagination')).not.toBeNull()
        expect(getApiKeyCards(el).map((c) => c.apiKey.id)).toEqual([
            'api-key-1',
            'api-key-2',
            'api-key-3',
            'api-key-4',
        ])
    })

    it('updates rendered cards when pagination changes page', async () => {
        mockApiKeysPageFlow(makeApiKeys(6))

        el = await fixture<UserUiApiKeys>(componentFixture)
        await waitUntil(() => el.apiKeys.length === 6)

        const pagination = el.shadowRoot?.querySelector('wg-pagination') as
            (HTMLElement & { page: number }) | null
        pagination?.dispatchEvent(new PageChangeEvent(2))

        await waitUntil(() => getApiKeyCards(el)[0]?.apiKey.id === 'api-key-5')

        expect(pagination?.page).toBe(2)
        expect(getApiKeyCards(el)).toHaveLength(2)
        expect(getApiKeyCards(el)[0]?.apiKey.id).toBe('api-key-5')
    })
})
