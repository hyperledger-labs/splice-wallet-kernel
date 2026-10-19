// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { elementUpdated, fixture } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    IdpFormCancelEvent,
    IdpFormComponent,
    IdpFormDeleteEvent,
    IdpFormSaveEvent,
} from './idp-form.js'
import { makeIdp } from './__tests__/fixtures.js'

function getForm(el: IdpFormComponent) {
    return el.shadowRoot!.querySelector<HTMLFormElement>('form')!
}

async function changeIdpType(
    el: IdpFormComponent,
    type: 'oauth' | 'self_signed' | 'self_issued'
) {
    const select = el.shadowRoot!.querySelector<HTMLSelectElement>('#idp-type')!
    select.value = type
    select.dispatchEvent(new Event('change'))
    await elementUpdated(el)
}

function fillIdpForm(
    el: IdpFormComponent,
    values: {
        id?: string
        issuer?: string
        configUrl?: string
    }
) {
    if (values.id !== undefined) {
        el.shadowRoot!.querySelector<HTMLInputElement>('#idp-id')!.value =
            values.id
    }
    if (values.issuer !== undefined) {
        el.shadowRoot!.querySelector<HTMLInputElement>('#idp-issuer')!.value =
            values.issuer
    }
    if (values.configUrl !== undefined) {
        el.shadowRoot!.querySelector<HTMLInputElement>(
            '#idp-config-url'
        )!.value = values.configUrl
    }
}

describe('idp-form', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('mounts without error', async () => {
        const el = await fixture<IdpFormComponent>(html`<idp-form></idp-form>`)

        expect(el).toBeInstanceOf(IdpFormComponent)
    })

    it('shows the add button in add mode', async () => {
        const el = await fixture<IdpFormComponent>(
            html`<idp-form mode="add"></idp-form>`
        )

        expect(el.shadowRoot?.textContent).toContain('Add')
        expect(el.shadowRoot?.querySelector('.delete-section')).toBeNull()
    })

    it('shows review actions and delete section in review mode', async () => {
        const el = await fixture<IdpFormComponent>(
            html`<idp-form
                mode="review"
                .idp=${makeIdp({ id: 'review-idp' })}
            ></idp-form>`
        )

        expect(el.shadowRoot?.textContent).toContain('Update')
        expect(el.shadowRoot?.textContent).toContain('Cancel')
        expect(el.shadowRoot?.textContent).toContain('Delete identity provider')
    })

    it('renders inputs appropriate for the selected idp type', async () => {
        const el = await fixture<IdpFormComponent>(
            html`<idp-form mode="add"></idp-form>`
        )

        expect(el.shadowRoot?.querySelector('#idp-issuer')).not.toBeNull()
        expect(el.shadowRoot?.querySelector('#idp-config-url')).not.toBeNull()

        await changeIdpType(el, 'self_signed')

        expect(el.shadowRoot?.querySelector('#idp-issuer')).not.toBeNull()
        expect(el.shadowRoot?.querySelector('#idp-config-url')).toBeNull()

        await changeIdpType(el, 'self_issued')

        expect(el.shadowRoot?.querySelector('#idp-issuer')).toBeNull()
        expect(el.shadowRoot?.querySelector('#idp-config-url')).toBeNull()

        await changeIdpType(el, 'oauth')

        expect(el.shadowRoot?.querySelector('#idp-issuer')).not.toBeNull()
        expect(el.shadowRoot?.querySelector('#idp-config-url')).not.toBeNull()
    })

    it('shows a validation error when required fields are missing', async () => {
        const el = await fixture<IdpFormComponent>(
            html`<idp-form mode="add"></idp-form>`
        )
        const saveListener = vi.fn()
        el.addEventListener('idp-form-save', saveListener)

        getForm(el).dispatchEvent(
            new Event('submit', { bubbles: true, cancelable: true })
        )
        await elementUpdated(el)

        expect(el.shadowRoot?.querySelector('.form-error')?.textContent).toBe(
            'Please fill in all required fields'
        )
        expect(saveListener).not.toHaveBeenCalled()
    })

    it('emits IdpFormSaveEvent with oauth configUrl in add mode', async () => {
        const el = await fixture<IdpFormComponent>(
            html`<idp-form mode="add"></idp-form>`
        )
        await changeIdpType(el, 'oauth')
        fillIdpForm(el, {
            id: 'new-idp',
            issuer: 'https://issuer.example',
            configUrl: 'https://issuer.example/.well-known',
        })

        const listener = vi.fn()
        el.addEventListener('idp-form-save', listener)

        getForm(el).requestSubmit()

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(IdpFormSaveEvent)
        expect((listener.mock.calls[0][0] as IdpFormSaveEvent).idp).toEqual({
            id: 'new-idp',
            type: 'oauth',
            issuer: 'https://issuer.example',
            configUrl: 'https://issuer.example/.well-known',
        })
    })

    it('omits configUrl from save payload for self_signed idps', async () => {
        const el = await fixture<IdpFormComponent>(
            html`<idp-form mode="add"></idp-form>`
        )
        await changeIdpType(el, 'oauth')
        fillIdpForm(el, {
            id: 'self-signed-idp',
            issuer: 'https://issuer.example',
            configUrl: 'https://should-be-ignored.example',
        })
        await changeIdpType(el, 'self_signed')

        const listener = vi.fn()
        el.addEventListener('idp-form-save', listener)

        getForm(el).requestSubmit()

        expect(listener).toHaveBeenCalledOnce()
        expect((listener.mock.calls[0][0] as IdpFormSaveEvent).idp).toEqual({
            id: 'self-signed-idp',
            type: 'self_signed',
            issuer: 'https://issuer.example',
        })
    })

    it('omits issuer from save payload for self_issued idps', async () => {
        const el = await fixture<IdpFormComponent>(
            html`<idp-form mode="add"></idp-form>`
        )
        await changeIdpType(el, 'self_issued')
        el.shadowRoot!.querySelector<HTMLInputElement>('#idp-id')!.value =
            'self-issued-idp'

        const listener = vi.fn()
        el.addEventListener('idp-form-save', listener)

        getForm(el).requestSubmit()

        expect(el.shadowRoot?.querySelector('#idp-issuer')).toBeNull()
        expect(listener).toHaveBeenCalledOnce()
        expect((listener.mock.calls[0][0] as IdpFormSaveEvent).idp).toEqual({
            id: 'self-issued-idp',
            type: 'self_issued',
        })
    })

    it('dispatches IdpFormDeleteEvent in review mode', async () => {
        const idp = makeIdp({ id: 'delete-me' })
        const el = await fixture<IdpFormComponent>(
            html`<idp-form mode="review" .idp=${idp}></idp-form>`
        )
        const listener = vi.fn()
        el.addEventListener('idp-form-delete', listener)

        el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-delete')!.click()

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(IdpFormDeleteEvent)
        expect((listener.mock.calls[0][0] as IdpFormDeleteEvent).idp).toBe(idp)
    })

    it('dispatches IdpFormCancelEvent in review mode', async () => {
        const el = await fixture<IdpFormComponent>(
            html`<idp-form mode="review" .idp=${makeIdp()}></idp-form>`
        )
        const listener = vi.fn()
        el.addEventListener('idp-form-cancel', listener)

        el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-cancel')!.click()

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(IdpFormCancelEvent)
    })

    it('emits IdpFormSaveEvent when updating in review mode', async () => {
        const idp = makeIdp({
            id: 'review-idp',
            issuer: 'https://old-issuer.example',
            configUrl: 'https://old-config.example',
        })
        const el = await fixture<IdpFormComponent>(
            html`<idp-form mode="review" .idp=${idp}></idp-form>`
        )
        fillIdpForm(el, {
            issuer: 'https://new-issuer.example',
            configUrl: 'https://new-config.example',
        })

        const listener = vi.fn()
        el.addEventListener('idp-form-save', listener)

        getForm(el).requestSubmit()

        expect(listener).toHaveBeenCalledOnce()
        expect((listener.mock.calls[0][0] as IdpFormSaveEvent).idp).toEqual({
            id: 'review-idp',
            type: 'oauth',
            issuer: 'https://new-issuer.example',
            configUrl: 'https://new-config.example',
        })
    })
})
