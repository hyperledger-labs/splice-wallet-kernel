// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import {
    IdpFormCancelEvent,
    IdpFormDeleteEvent,
    IdpFormSaveEvent,
} from '@canton-network/core-wallet-ui-components'
import {
    createMockUserClient,
    makeIdp,
    mockIdpsPageFlow,
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
import type { UserUiReviewIdp } from './index.js'

const idp = makeIdp({ id: 'idp-review' })

describe('UserUiReviewIdp', () => {
    let el: UserUiReviewIdp
    const componentFixture = html`<user-ui-review-idp></user-ui-review-idp>`

    beforeEach(async () => {
        mockCreateUserClient.mockReset()
        mockRequest.mockReset()
        handleErrorToast.mockReset()
        setLocationHref.mockReset()
        mockCreateUserClient.mockResolvedValue(createMockUserClient())
        mockIdpsPageFlow([idp])
        history.replaceState({}, '', '?id=idp-review')
        vi.stubGlobal(
            'confirm',
            vi.fn(() => true)
        )
        el = await fixture<UserUiReviewIdp>(componentFixture)
    })

    afterEach(() => {
        // make sure toast is gone from DOM
        document.body.innerHTML = ''
        vi.unstubAllGlobals()
    })

    it('loads and renders the review form for the idp in the URL', async () => {
        await waitUntil(() => el.idp?.id === 'idp-review')

        expect(el.shadowRoot?.querySelector('h1')?.textContent).toBe(
            'Review Identity Provider'
        )
        expect(el.shadowRoot?.querySelector('idp-form')).not.toBeNull()
    })

    it('calls addIdp when the form is saved', async () => {
        await waitUntil(() => el.idp !== null)

        el.shadowRoot
            ?.querySelector('idp-form')
            ?.dispatchEvent(new IdpFormSaveEvent(idp))

        await waitUntil(() =>
            mockRequest.mock.calls.some((c) => c[0]?.method === 'addIdp')
        )

        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({ method: 'addIdp' })
        )
    })

    it('calls removeIdp when delete is confirmed', async () => {
        await waitUntil(() => el.idp !== null)

        el.shadowRoot
            ?.querySelector('idp-form')
            ?.dispatchEvent(new IdpFormDeleteEvent(idp))

        await waitUntil(() =>
            mockRequest.mock.calls.some((c) => c[0]?.method === 'removeIdp')
        )

        expect(mockRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                method: 'removeIdp',
                params: { identityProviderId: 'idp-review' },
            })
        )
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/identity-providers/')
        )
    })

    it('navigates back when the URL has no identity provider id', async () => {
        history.replaceState({}, '', '?')
        el = await fixture<UserUiReviewIdp>(componentFixture)

        await waitUntil(() => setLocationHref.mock.calls.length > 0)

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/identity-providers')
        )
        expect(el.idp).toBeNull()
        expect(handleErrorToast).not.toHaveBeenCalled()
    })

    it('navigates back when the identity provider is not found', async () => {
        history.replaceState({}, '', '?id=missing-idp')
        el = await fixture<UserUiReviewIdp>(componentFixture)

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/identity-providers')
        )
        expect(el.idp).toBeNull()
    })

    it('navigates back when loading idps fails', async () => {
        mockRequest.mockRejectedValue(new Error('list failed'))
        el = await fixture<UserUiReviewIdp>(componentFixture)

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/identity-providers')
        )
    })

    it('navigates back when the form is cancelled', async () => {
        await waitUntil(() => el.idp !== null)

        setLocationHref.mockClear()
        el.shadowRoot
            ?.querySelector('idp-form')
            ?.dispatchEvent(new IdpFormCancelEvent())

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/identity-providers')
        )
    })

    it('navigates to the list after a successful save', async () => {
        await waitUntil(() => el.idp !== null)

        setLocationHref.mockClear()
        el.shadowRoot
            ?.querySelector('idp-form')
            ?.dispatchEvent(new IdpFormSaveEvent(idp))

        await waitUntil(() => setLocationHref.mock.calls.length > 0)

        expect(setLocationHref).toHaveBeenCalledWith(
            expect.stringContaining('/identity-providers/')
        )
    })

    it('calls handleErrorToast when save fails', async () => {
        await waitUntil(() => el.idp !== null)

        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'listIdps') {
                return { idps: [idp] }
            }
            if (method === 'addIdp') {
                throw new Error('save failed')
            }
            return undefined
        })

        el.shadowRoot
            ?.querySelector('idp-form')
            ?.dispatchEvent(new IdpFormSaveEvent(idp))

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
    })

    it('does not delete when confirmation is declined', async () => {
        await waitUntil(() => el.idp !== null)
        vi.mocked(confirm).mockReturnValue(false)

        el.shadowRoot
            ?.querySelector('idp-form')
            ?.dispatchEvent(new IdpFormDeleteEvent(idp))

        expect(
            mockRequest.mock.calls.some((c) => c[0]?.method === 'removeIdp')
        ).toBe(false)
    })

    it('calls handleErrorToast when delete fails', async () => {
        await waitUntil(() => el.idp !== null)

        mockRequest.mockImplementation(async ({ method }) => {
            if (method === 'listIdps') {
                return { idps: [idp] }
            }
            if (method === 'removeIdp') {
                throw new Error('delete failed')
            }
            return undefined
        })

        el.shadowRoot
            ?.querySelector('idp-form')
            ?.dispatchEvent(new IdpFormDeleteEvent(idp))

        await waitUntil(() => handleErrorToast.mock.calls.length > 0)

        expect(handleErrorToast).toHaveBeenCalled()
    })
})
