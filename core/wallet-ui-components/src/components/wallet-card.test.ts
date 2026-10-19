// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import './copy-button.js'
import './wallet-card.js'
import { WalletAllocateEvent, WalletSetPrimaryEvent } from './wallet-card.js'
import { makeWallet, PartyLevelRight } from './__tests__/fixtures.js'

describe('wg-wallet-card', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('sets the party-id host element attribute', async () => {
        const wallet = makeWallet({ partyId: 'party::abc' })
        const el = await fixture(
            html`<wg-wallet-card .wallet=${wallet}></wg-wallet-card>`
        )

        expect(el.getAttribute('party-id')).toBe('party::abc')
    })

    it('truncates long party IDs in the display value', async () => {
        const longPartyId = 'a'.repeat(30)
        const el = await fixture(
            html`<wg-wallet-card
                .wallet=${makeWallet({ partyId: longPartyId })}
                .verified=${true}
            ></wg-wallet-card>`
        )

        const partyValue =
            el.shadowRoot!.querySelector<HTMLElement>('.party-id-value')!
        expect(partyValue.textContent?.trim()).toBe(
            `${longPartyId.slice(0, 10)}...${longPartyId.slice(-10)}`
        )
        expect(partyValue.title).toBe(longPartyId)
    })

    it('emits WalletSetPrimaryEvent for verified non-primary wallets', async () => {
        const wallet = makeWallet({ primary: false, disabled: false })
        const el = await fixture(
            html`<wg-wallet-card
                .wallet=${wallet}
                .verified=${true}
            ></wg-wallet-card>`
        )

        const listener = vi.fn()
        el.addEventListener('wallet-set-primary', listener)

        el.shadowRoot!.querySelector<HTMLButtonElement>('.link-action')!.click()

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(WalletSetPrimaryEvent)
        expect(
            (listener.mock.calls[0][0] as WalletSetPrimaryEvent).wallet
        ).toBe(wallet)
    })

    it('emits WalletAllocateEvent when the wallet is not verified', async () => {
        const wallet = makeWallet()
        const el = await fixture(
            html`<wg-wallet-card
                .wallet=${wallet}
                .verified=${false}
            ></wg-wallet-card>`
        )

        const listener = vi.fn()
        el.addEventListener('wallet-allocate', listener)

        el.shadowRoot!.querySelector<HTMLButtonElement>('button')!.click()

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0][0]).toBeInstanceOf(WalletAllocateEvent)
    })

    it('renders rights badges when present', async () => {
        const wallet = makeWallet({
            rights: [PartyLevelRight.CanActAs, PartyLevelRight.CanReadAs],
            primary: true,
        })
        const el = await fixture(
            html`<wg-wallet-card
                .wallet=${wallet}
                .verified=${true}
            ></wg-wallet-card>`
        )

        expect(el.shadowRoot?.textContent).toContain('CanActAs')
        expect(el.shadowRoot?.textContent).toContain('CanReadAs')
    })
})
