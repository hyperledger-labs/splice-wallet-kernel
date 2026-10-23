// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture, waitUntil } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it } from 'vitest'
import { makeWallet } from '../components/__tests__/fixtures.js'
import '../components/wallet-list.js'
import type { WgWalletList } from '../components/wallet-list.js'

const token = (element: Element, name: string) =>
    getComputedStyle(element).getPropertyValue(name).trim()

async function nestedCard(list: WgWalletList) {
    await waitUntil(() => list.shadowRoot?.querySelector('wg-wallet-card'))
    const card = list.shadowRoot!.querySelector('wg-wallet-card')!
    await waitUntil(() => card.shadowRoot?.querySelector('wg-copy-button'))
    return card
}

describe('theming', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('lets a base token set on an ancestor reach nested components', async () => {
        const wrapper = await fixture<HTMLElement>(
            html`<div
                style="--wg-theme-surface-color: rgb(1, 2, 3); --wg-theme-text-rgb: 4, 5, 6; --wg-theme-accent-color: rgb(7, 8, 9)"
            >
                <wg-wallet-list
                    .wallets=${[makeWallet({ status: 'allocated' })]}
                ></wg-wallet-list>
            </div>`
        )
        const list = wrapper.querySelector<WgWalletList>('wg-wallet-list')!
        // list > card > copy button: the page's tokens must reach all three
        const card = await nestedCard(list)
        const copyButton = card.shadowRoot!.querySelector('wg-copy-button')!

        for (const element of [list, card, copyButton]) {
            expect(token(element, '--wg-surface')).toBe('rgb(1, 2, 3)')
            expect(token(element, '--wg-text-rgb')).toBe('4, 5, 6')
            expect(token(element, '--wg-accent')).toBe('rgb(7, 8, 9)')
            // Bootstrap's text-body utility reads this channel
            expect(token(element, '--bs-body-color-rgb')).toBe('4, 5, 6')
        }
    })

    it('falls back to the defaults when nothing is overridden', async () => {
        const list = await fixture<WgWalletList>(
            html`<wg-wallet-list
                .wallets=${[makeWallet({ status: 'allocated' })]}
            ></wg-wallet-list>`
        )
        const card = await nestedCard(list)

        expect(token(card, '--wg-surface')).toBe('#ffffff')
        expect(token(card, '--wg-accent')).toBe('#7c3aed')
        expect(token(card, '--wg-shade-rgb')).toBe('15, 23, 42')
    })

    it('derives the label and focus colours from the accent colour', async () => {
        const wrapper = await fixture<HTMLElement>(
            html`<div style="--wg-theme-accent-color: rgb(7, 8, 9)">
                <wg-wallet-list></wg-wallet-list>
            </div>`
        )
        const list = wrapper.querySelector('wg-wallet-list')!

        expect(token(list, '--wg-label-color')).toBe('rgb(7, 8, 9)')
        expect(token(list, '--wg-input-border-focus')).toBe('rgb(7, 8, 9)')
    })
})
