// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { elementUpdated, fixture } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { WgNetworks } from './networks.js'
import { makePublicNetwork } from './__tests__/fixtures.js'

describe('wg-networks', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('mounts without error', async () => {
        const el = await fixture<WgNetworks>(
            html`<wg-networks .networks=${[makePublicNetwork()]}></wg-networks>`
        )

        expect(el).toBeInstanceOf(WgNetworks)
    })

    it('opens and closes the add network modal', async () => {
        const el = await fixture<WgNetworks>(
            html`<wg-networks .networks=${[]}></wg-networks>`
        )

        expect(el.shadowRoot?.querySelector('.modal')).toBeNull()

        el.shadowRoot!.querySelector<HTMLButtonElement>('.btn-primary')!.click()
        await elementUpdated(el)

        const modal = el.shadowRoot?.querySelector('.modal')
        expect(modal).not.toBeNull()
        expect(
            el.shadowRoot?.querySelector('.modal h3')?.textContent?.trim()
        ).toBe('Add Network')
        ;(modal as HTMLElement).click()
        await elementUpdated(el)

        expect(el.shadowRoot?.querySelector('.modal')).toBeNull()
    })
})
