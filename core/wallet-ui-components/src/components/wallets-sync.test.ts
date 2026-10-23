// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture } from '@open-wc/testing-helpers'
import { html } from 'lit'
import { afterEach, describe, expect, it, vi } from 'vitest'
import './wallets-sync.js'
import { WalletsSyncEvent, WgWalletsSync } from './wallets-sync.js'

function getSyncButton(el: WgWalletsSync) {
    return el.shadowRoot!.querySelector<HTMLButtonElement>('.sync-button')!
}

describe('wg-wallets-sync', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('mounts without error', async () => {
        const el = await fixture<WgWalletsSync>(
            html`<wg-wallets-sync></wg-wallets-sync>`
        )

        expect(el).toBeInstanceOf(WgWalletsSync)
        expect(getSyncButton(el).disabled).toBe(false)
        expect(getSyncButton(el).title).toBe('Refresh parties')
    })

    it('emits wallets-sync when the button is clicked', async () => {
        const el = await fixture<WgWalletsSync>(
            html`<wg-wallets-sync></wg-wallets-sync>`
        )
        const listener = vi.fn()
        el.addEventListener('wallets-sync', listener)

        getSyncButton(el).click()

        expect(listener).toHaveBeenCalledOnce()
        expect(listener.mock.calls[0]![0]).toBeInstanceOf(WalletsSyncEvent)
    })

    it('marks the button as out-of-sync when sync is needed', async () => {
        const el = await fixture<WgWalletsSync>(
            html`<wg-wallets-sync syncNeeded></wg-wallets-sync>`
        )

        expect(getSyncButton(el).classList.contains('out-of-sync')).toBe(true)
        expect(getSyncButton(el).title).toBe(
            'Refresh parties (changes available)'
        )
    })

    it('disables the button and shows the syncing title while syncing', async () => {
        const el = await fixture<WgWalletsSync>(
            html`<wg-wallets-sync syncNeeded syncing></wg-wallets-sync>`
        )
        const listener = vi.fn()
        el.addEventListener('wallets-sync', listener)

        expect(getSyncButton(el).disabled).toBe(true)
        expect(getSyncButton(el).title).toBe('Syncing parties...')
        getSyncButton(el).click()
        expect(listener).not.toHaveBeenCalled()
    })

    it('disables the button when disabled', async () => {
        const el = await fixture<WgWalletsSync>(
            html`<wg-wallets-sync disabled></wg-wallets-sync>`
        )

        expect(getSyncButton(el).disabled).toBe(true)
    })
})
