// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import {
    createMockUserClient,
    mockApiKeysPageFlow,
    mockRequest,
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
import type { UserUiAddApiKey } from './index.js'
import { ApiKeyGenerateEvent } from '@canton-network/core-wallet-ui-components'

describe('UserUiAddApiKey', () => {
    let el: UserUiAddApiKey
    const componentFixture = html`<user-ui-add-api-key></user-ui-add-api-key>`

    beforeEach(async () => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        handleErrorToast.mockReset()
        setLocationHref.mockReset()
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        mockApiKeysPageFlow([])
        el = await fixture<UserUiAddApiKey>(componentFixture)
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
    })

    it('renders the add-api-key form', () => {
        expect(el.shadowRoot?.querySelector('h1')?.textContent).toBe(
            'Generate new API Key'
        )
        expect(el.shadowRoot?.querySelector('api-key-form')).not.toBeNull()
    })

    it('calls generateApiKey when the form is saved', async () => {
        const form = el.shadowRoot?.querySelector('api-key-form')
        form?.dispatchEvent(new ApiKeyGenerateEvent({ name: 'New API Key' }))

        await waitUntil(() =>
            mockRequest.mock.calls.some(
                (c) => c[0]?.method === 'generateApiKey'
            )
        )

        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'generateApiKey' })
        )
    })

    it('navigates back when Back is clicked', () => {
        const backBtn = el.shadowRoot?.querySelector(
            '.page-header button'
        ) as HTMLButtonElement
        backBtn.click()

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/api-keys')
        )
    })

    it('calls handleErrorToast and clears loading when generateApiKey fails', async () => {
        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'generateApiKey') {
                throw new Error('generate failed')
            }
            return undefined
        })

        el.loading = true
        el.shadowRoot
            ?.querySelector('api-key-form')
            ?.dispatchEvent(new ApiKeyGenerateEvent({ name: 'New API Key' }))

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
        expect(el.loading).toBe(false)
        expect(setLocationHref).not.toHaveBeenCalled()
    })
})
