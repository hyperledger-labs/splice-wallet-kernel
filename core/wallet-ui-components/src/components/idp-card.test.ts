// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import './copy-button.js'
import { IdpCard, IdpCardReviewEvent } from './idp-card.js'
import { makeIdp } from './__tests__/fixtures.js'

describe('idp-card', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('mounts without error', async () => {
        const el = await fixture<IdpCard>(
            html`<idp-card .idp=${makeIdp()}></idp-card>`
        )

        expect(el).toBeInstanceOf(IdpCard)
    })

    it('shows a placeholder when no idp is supplied', async () => {
        const el = await fixture<IdpCard>(html`<idp-card></idp-card>`)

        expect(el.shadowRoot?.textContent).toContain(
            'No identity provider supplied'
        )
    })

    it('renders idp metadata', async () => {
        const idp = makeIdp({
            id: 'my-idp',
            type: 'oauth',
            issuer: 'https://issuer.example',
            configUrl: 'https://issuer.example/.well-known',
        })
        const el = await fixture<IdpCard>(
            html`<idp-card .idp=${idp}></idp-card>`
        )

        expect(el.shadowRoot?.textContent).toContain('my-idp')
        expect(el.shadowRoot?.textContent).toContain('oauth')
        expect(el.shadowRoot?.textContent).toContain('https://issuer.example')
        expect(el.shadowRoot?.textContent).toContain(
            'https://issuer.example/.well-known'
        )
    })

    it('omits the config URL row when configUrl is absent', async () => {
        const idp = makeIdp({ type: 'self_signed' })
        const el = await fixture<IdpCard>(
            html`<idp-card .idp=${idp}></idp-card>`
        )

        expect(el.shadowRoot?.textContent).not.toContain('Config URL')
    })

    it('omits the issuer row when issuer is absent', async () => {
        const idp = makeIdp({ type: 'self_issued' })
        const el = await fixture<IdpCard>(
            html`<idp-card .idp=${idp}></idp-card>`
        )

        expect(el.shadowRoot?.textContent).not.toContain('Issuer')
    })

    it('emits IdpCardReviewEvent when the card is clicked', async () => {
        const idp = makeIdp()
        const el = await fixture<IdpCard>(
            html`<idp-card .idp=${idp}></idp-card>`
        )

        const listener = vi.fn()
        el.addEventListener('idp-review', listener)

        el.shadowRoot!.querySelector<HTMLElement>('.idp-card')!.click()

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(IdpCardReviewEvent)
        expect((listener.mock.calls[0][0] as IdpCardReviewEvent).idp).toBe(idp)
    })
})
