// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { elementUpdated, fixture } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import './network-form.js'
import {
    NetworkDeleteEvent,
    NetworkEditCancelEvent,
    NetworkEditSaveEvent,
    NetworkForm,
} from './network-form.js'
import { makeNetwork } from './__tests__/fixtures.js'

function submitForm(el: NetworkForm) {
    const form = el.shadowRoot!.querySelector<HTMLFormElement>('form')!
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function setInputValue(input: HTMLInputElement, value: string) {
    input.value = value
    input.dispatchEvent(new Event('change', { bubbles: true }))
}

function getFormInputs(el: NetworkForm) {
    return Array.from(
        el.shadowRoot!.querySelectorAll<HTMLInputElement>(
            '.form-fields > .field-group input.field-control'
        )
    )
}

function fillFormInputs(
    el: NetworkForm,
    values: {
        id?: string
        name?: string
        description?: string
        synchronizerId?: string
        identityProviderId?: string
        ledgerApiBaseUrl?: string
    }
) {
    const [
        id,
        name,
        description,
        synchronizerId,
        identityProviderId,
        ledgerApi,
    ] = getFormInputs(el)

    if (values.id !== undefined) setInputValue(id, values.id)
    if (values.name !== undefined) setInputValue(name, values.name)
    if (values.description !== undefined) {
        setInputValue(description, values.description)
    }
    if (values.synchronizerId !== undefined) {
        setInputValue(synchronizerId, values.synchronizerId)
    }
    if (values.identityProviderId !== undefined) {
        setInputValue(identityProviderId, values.identityProviderId)
    }
    if (values.ledgerApiBaseUrl !== undefined) {
        setInputValue(ledgerApi, values.ledgerApiBaseUrl)
    }
}

describe('network-form', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('mounts without error', async () => {
        const el = await fixture<NetworkForm>(
            html`<network-form></network-form>`
        )

        expect(el).toBeInstanceOf(NetworkForm)
    })

    it('shows the add button in add mode', async () => {
        const el = await fixture<NetworkForm>(
            html`<network-form mode="add"></network-form>`
        )

        expect(el.shadowRoot?.textContent).toContain('Add')
        expect(el.shadowRoot?.querySelector('.delete-section')).toBeNull()
    })

    it('shows review actions and delete section in review mode', async () => {
        const el = await fixture<NetworkForm>(
            html`<network-form
                mode="review"
                .network=${makeNetwork({ id: 'review-net' })}
            ></network-form>`
        )

        expect(el.shadowRoot?.textContent).toContain('Update')
        expect(el.shadowRoot?.textContent).toContain('Cancel')
        expect(el.shadowRoot?.textContent).toContain('Delete Network')
        expect(el.shadowRoot?.textContent).toContain('Configure user auth')
    })

    it('shows a validation error when network data is invalid', async () => {
        const el = await fixture<NetworkForm>(
            html`<network-form mode="add"></network-form>`
        )
        const saveListener = vi.fn()
        el.addEventListener('network-edit-save', saveListener)

        submitForm(el)
        await elementUpdated(el)

        expect(el.shadowRoot?.querySelector('.form-error')?.textContent).toBe(
            'Invalid network data, please ensure all fields are set correctly'
        )
        expect(saveListener).not.toHaveBeenCalled()
    })

    it('emits NetworkEditSaveEvent in add mode with a valid network', async () => {
        const network = makeNetwork({
            id: 'new-net',
            name: 'New Network',
            description: 'A new network',
            identityProviderId: 'idp-1',
            ledgerApi: 'http://localhost:6865',
        })
        const el = await fixture<NetworkForm>(
            html`<network-form mode="add" .network=${network}></network-form>`
        )

        const listener = vi.fn()
        el.addEventListener('network-edit-save', listener)

        submitForm(el)

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(NetworkEditSaveEvent)
        expect(
            (listener.mock.calls[0][0] as NetworkEditSaveEvent).network
        ).toEqual(network)
    })

    it('dispatches NetworkDeleteEvent in review mode', async () => {
        const network = makeNetwork({ id: 'delete-me' })
        const el = await fixture<NetworkForm>(
            html`<network-form
                mode="review"
                .network=${network}
            ></network-form>`
        )
        const listener = vi.fn()
        el.addEventListener('network-delete', listener)

        el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-delete')!.click()

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(NetworkDeleteEvent)
        expect(
            (listener.mock.calls[0][0] as NetworkDeleteEvent).network
        ).toEqual(network)
    })

    it('dispatches NetworkEditCancelEvent in review mode', async () => {
        const el = await fixture<NetworkForm>(
            html`<network-form
                mode="review"
                .network=${makeNetwork()}
            ></network-form>`
        )
        const listener = vi.fn()
        el.addEventListener('network-edit-cancel', listener)

        el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-cancel')!.click()

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(NetworkEditCancelEvent)
    })

    it('emits NetworkEditSaveEvent when updating in review mode', async () => {
        const network = makeNetwork({
            id: 'review-net',
            name: 'Old Name',
            auth: {
                method: 'authorization_code',
                audience: 'audience',
                scope: 'scope',
                clientId: 'client-id',
            },
        })
        const el = await fixture<NetworkForm>(
            html`<network-form
                mode="review"
                .network=${network}
            ></network-form>`
        )

        fillFormInputs(el, { name: 'Updated Name' })

        const listener = vi.fn()
        el.addEventListener('network-edit-save', listener)

        submitForm(el)

        expect(listener).toHaveBeenCalledOnce()
        expect(
            (listener.mock.calls[0][0] as NetworkEditSaveEvent).network
        ).toEqual({
            ...network,
            name: 'Updated Name',
        })
    })

    it('shows client secret field for client_credentials auth in review mode', async () => {
        const network = makeNetwork({
            auth: {
                method: 'client_credentials',
                audience: 'audience',
                scope: 'scope',
                clientId: 'client-id',
                clientSecret: 'secret',
            },
        })
        const el = await fixture<NetworkForm>(
            html`<network-form
                mode="review"
                .network=${network}
            ></network-form>`
        )

        expect(el.shadowRoot?.textContent).toContain('Client Secret')

        const methodSelect = el.shadowRoot!.querySelector<HTMLSelectElement>(
            '.form-fields select.field-control'
        )!
        methodSelect.value = 'authorization_code'
        methodSelect.dispatchEvent(new Event('change', { bubbles: true }))
        await elementUpdated(el)
        expect(el.shadowRoot?.textContent).not.toContain('Client Secret')

        methodSelect.value = 'client_credentials'
        methodSelect.dispatchEvent(new Event('change', { bubbles: true }))
        await elementUpdated(el)
        expect(el.shadowRoot?.textContent).toContain('Client Secret')
    })

    it('uses api-shaped ledgerApi string while validating with store zod', async () => {
        const apiShapedNetwork = makeNetwork({
            id: 'api-shaped-net',
            name: 'API Shaped',
            description: 'Network loaded from API',
            identityProviderId: 'idp-api',
            ledgerApi: 'http://localhost:9999',
            auth: {
                method: 'client_credentials',
                audience: 'audience',
                scope: 'scope',
                clientId: 'client-id',
                clientSecret: 'client-secret',
            },
        })
        const el = await fixture<NetworkForm>(
            html`<network-form
                mode="review"
                .network=${apiShapedNetwork}
            ></network-form>`
        )

        const [, , , , , ledgerApiInput] = getFormInputs(el)
        expect(ledgerApiInput?.value).toBe('http://localhost:9999')

        const listener = vi.fn()
        el.addEventListener('network-edit-save', listener)
        submitForm(el)

        expect(listener).toHaveBeenCalledOnce()
        expect(
            (listener.mock.calls[0][0] as NetworkEditSaveEvent).network
                .ledgerApi
        ).toBe('http://localhost:9999')
    })
})
