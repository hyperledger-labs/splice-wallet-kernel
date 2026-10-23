// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import './page-header.js'
import { WgPageHeader } from './page-header.js'

describe('wg-page-header', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('renders the heading', async () => {
        const el = await fixture<WgPageHeader>(
            html`<wg-page-header heading="Parties"></wg-page-header>`
        )

        expect(el).toBeInstanceOf(WgPageHeader)
        expect(el.shadowRoot!.querySelector('h1')!.textContent).toBe('Parties')
    })

    it('renders actions in the default slot and the title suffix next to the title', async () => {
        const el = await fixture<WgPageHeader>(
            html`<wg-page-header heading="Parties">
                <span slot="title-suffix" id="suffix"></span>
                <button id="action">New</button>
            </wg-page-header>`
        )

        const suffixSlot = el.shadowRoot!.querySelector<HTMLSlotElement>(
            'slot[name="title-suffix"]'
        )!
        const defaultSlot =
            el.shadowRoot!.querySelector<HTMLSlotElement>('slot:not([name])')!

        expect(suffixSlot.assignedElements()[0]!.id).toBe('suffix')
        expect(
            defaultSlot.assignedElements().map((element) => element.id)
        ).toEqual(['action'])
        expect(suffixSlot.closest('.page-title-wrap')).not.toBeNull()
    })
})
