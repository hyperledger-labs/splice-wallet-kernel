// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import './copy-button.js'
import './network-card.js'
import { NetworkCardReviewEvent } from './network-card.js'
import { makePublicNetwork } from './__tests__/fixtures.js'

describe('network-card', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('shows a placeholder when no network is supplied', async () => {
        const el = await fixture(html`<network-card></network-card>`)

        expect(el.shadowRoot?.textContent).toContain('No network supplied')
    })

    it('emits NetworkCardReviewEvent when the card is clicked', async () => {
        const network = makePublicNetwork()
        const el = await fixture(
            html`<network-card .network=${network}></network-card>`
        )

        const listener = vi.fn()
        el.addEventListener('network-review', listener)

        el.shadowRoot!.querySelector<HTMLElement>('.net-card')!.click()

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(NetworkCardReviewEvent)
        expect(
            (listener.mock.calls[0][0] as NetworkCardReviewEvent).network
        ).toBe(network)
    })

    it('shows the connected badge and token copy control for active sessions', async () => {
        const el = await fixture(
            html`<network-card
                .network=${makePublicNetwork()}
                .activeSession=${true}
                .accessToken=${'secret-token'}
            ></network-card>`
        )

        expect(el.shadowRoot?.textContent).toContain('CONNECTED')
        expect(el.shadowRoot?.querySelector('wg-copy-button')).not.toBeNull()
    })
})
