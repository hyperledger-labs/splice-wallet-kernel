// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeWallet } from './__tests__/fixtures.js'
import './wallet-list.js'
import { WalletAllocateEvent, type WgWalletCard } from './wallet-card.js'
import { type WgWalletList } from './wallet-list.js'

const cards = (el: WgWalletList) => [
    ...el.shadowRoot!.querySelectorAll<WgWalletCard>('wg-wallet-card'),
]

describe('wg-wallet-list', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('shows a loading text until the wallets are set', async () => {
        const el = await fixture<WgWalletList>(
            html`<wg-wallet-list></wg-wallet-list>`
        )

        expect(el.shadowRoot!.textContent).toContain('Loading parties...')
        expect(cards(el)).toHaveLength(0)

        el.wallets = []
        await el.updateComplete

        expect(el.shadowRoot!.textContent).not.toContain('Loading parties...')
    })

    it('renders unallocated wallets before allocated ones', async () => {
        const wallets = [
            makeWallet({ partyId: 'alloc::ns', status: 'allocated' }),
            makeWallet({ partyId: 'init::ns', status: 'initialized' }),
        ]
        const el = await fixture<WgWalletList>(
            html`<wg-wallet-list .wallets=${wallets}></wg-wallet-list>`
        )

        const rendered = cards(el)

        expect(rendered.map((card) => card.wallet?.partyId)).toEqual([
            'init::ns',
            'alloc::ns',
        ])
        expect(rendered.map((card) => card.verified)).toEqual([false, true])
    })

    it('marks wallets of the non-editable signing provider as not editable', async () => {
        const wallets = [
            makeWallet({
                partyId: 'a::ns',
                status: 'allocated',
                signingProviderId: 'participant',
            }),
            makeWallet({
                partyId: 'b::ns',
                status: 'allocated',
                signingProviderId: 'fireblocks',
            }),
        ]
        const el = await fixture<WgWalletList>(
            html`<wg-wallet-list
                .wallets=${wallets}
                nonEditableSigningProviderId="participant"
            ></wg-wallet-list>`
        )

        expect(cards(el).map((card) => card.editable)).toEqual([false, true])
    })

    it('passes loading to the cards', async () => {
        const el = await fixture<WgWalletList>(
            html`<wg-wallet-list
                .wallets=${[makeWallet({ status: 'allocated' })]}
                loading
            ></wg-wallet-list>`
        )

        expect(cards(el)[0]!.loading).toBe(true)
    })

    it('lets card events bubble out of the list', async () => {
        const wallet = makeWallet({ status: 'initialized' })
        const el = await fixture<WgWalletList>(
            html`<wg-wallet-list .wallets=${[wallet]}></wg-wallet-list>`
        )
        const listener = vi.fn()
        el.addEventListener('wallet-allocate', listener)

        const card = cards(el)[0]!
        card.dispatchEvent(new WalletAllocateEvent(wallet))

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0]![0].wallet).toBe(wallet)
    })
})
