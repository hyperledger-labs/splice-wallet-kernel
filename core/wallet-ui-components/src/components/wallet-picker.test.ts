// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { fixture, html } from '@open-wc/testing-helpers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeWalletPickerEntry } from './__tests__/fixtures.js'
import './wallet-picker.js'
import { WalletPicker } from './wallet-picker.js'

const ENTRIES_KEY = 'splice_wallet_picker_entries'
const RECENT_KEY = 'splice_wallet_picker_recent'

function setPickerEntries(entries: ReturnType<typeof makeWalletPickerEntry>[]) {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
}

function setRecentGateways(gateways: { name: string; rpcUrl: string }[]) {
    localStorage.setItem(RECENT_KEY, JSON.stringify(gateways))
}

function mockOpener(postMessage = vi.fn()) {
    Object.defineProperty(window, 'opener', {
        value: { postMessage },
        configurable: true,
        writable: true,
    })
    return postMessage
}

describe('WalletPicker', () => {
    beforeEach(() => {
        localStorage.clear()
        mockOpener()
    })

    afterEach(() => {
        vi.restoreAllMocks()
        Object.defineProperty(window, 'opener', {
            value: null,
            configurable: true,
            writable: true,
        })
    })

    it('mounts without error', async () => {
        const el = await fixture<WalletPicker>(
            html`<swk-wallet-picker></swk-wallet-picker>`
        )
        expect(el).toBeInstanceOf(WalletPicker)
    })

    it('shows empty state when no wallets are registered', async () => {
        const el = await fixture<WalletPicker>(
            html`<swk-wallet-picker></swk-wallet-picker>`
        )

        expect(el.shadowRoot!.textContent).toContain('No wallets available')
    })

    it('renders registered wallet entries from localStorage', async () => {
        setPickerEntries([
            makeWalletPickerEntry({ name: 'Remote Gateway 1' }),
            makeWalletPickerEntry({
                providerId: 'remote:provider-id2',
                name: 'Remote Gateway 2',
                type: 'remote',
                url: 'http://gw',
            }),
        ])

        const el = await fixture<WalletPicker>(
            html`<swk-wallet-picker></swk-wallet-picker>`
        )

        const cards = el.shadowRoot!.querySelectorAll('.wallet-card')
        expect(cards.length).toBe(2)
        expect(el.shadowRoot!.textContent).toContain('Remote Gateway 1')
        expect(el.shadowRoot!.textContent).toContain('Remote Gateway 2')
    })

    it('includes recent gateways not in the registered list', async () => {
        setPickerEntries([makeWalletPickerEntry({ name: 'Registered' })])
        setRecentGateways([{ name: 'Recent', rpcUrl: 'http://recent.example' }])

        const el = await fixture<WalletPicker>(
            html`<swk-wallet-picker></swk-wallet-picker>`
        )

        expect(el.shadowRoot!.textContent).toContain('Registered')
        expect(el.shadowRoot!.textContent).toContain('Recent')
    })

    it('posts selection to opener when a wallet card is clicked', async () => {
        const postMessage = mockOpener()
        setPickerEntries([
            makeWalletPickerEntry({
                providerId: 'browser:ext:ext-wallet',
                name: 'Ext Wallet',
                type: 'extension',
            }),
        ])

        const el = await fixture<WalletPicker>(
            html`<swk-wallet-picker></swk-wallet-picker>`
        )

        const card = el.shadowRoot!.querySelector('.wallet-card') as HTMLElement
        card.click()

        expect(postMessage).toHaveBeenCalledWith(
            {
                messageType: 'SPLICE_WALLET_PICKER_RESULT',
                providerId: 'browser:ext:ext-wallet',
                name: 'Ext Wallet',
                walletType: 'extension',
                url: undefined,
                reuseGlobalWalletPopup: undefined,
            },
            '*'
        )
        expect(el.shadowRoot!.textContent).toContain('Connecting')
    })

    it('connects via custom URL input', async () => {
        const postMessage = mockOpener()

        const el = await fixture<WalletPicker>(
            html`<swk-wallet-picker></swk-wallet-picker>`
        )

        const input = el.shadowRoot!.querySelector(
            '.custom-url-input'
        ) as HTMLInputElement
        input.value = 'http://custom.example'

        const connectBtn = el.shadowRoot!.querySelector(
            '.btn-add'
        ) as HTMLButtonElement
        connectBtn.click()

        expect(postMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                messageType: 'SPLICE_WALLET_PICKER_RESULT',
                providerId: 'remote:http://custom.example',
                name: 'http://custom.example',
                walletType: 'remote',
                url: 'http://custom.example',
                reuseGlobalWalletPopup: true,
            }),
            '*'
        )
    })

    it('shows connected state when opener reports success', async () => {
        const postMessage = mockOpener()
        setPickerEntries([
            makeWalletPickerEntry({
                name: 'Wallet123',
                providerId: 'remote:wallet123',
            }),
        ])

        const el = await fixture<WalletPicker>(
            html`<swk-wallet-picker></swk-wallet-picker>`
        )

        const card = el.shadowRoot!.querySelector('.wallet-card') as HTMLElement
        card.click()

        window.dispatchEvent(
            new MessageEvent('message', {
                origin: window.location.origin,
                data: {
                    messageType: 'SPLICE_WALLET_PICKER_CONNECT_STATUS',
                    status: 'connected',
                },
            })
        )

        expect(el.shadowRoot!.textContent).toContain('Connected')
        expect(el.shadowRoot!.textContent).toContain('Wallet123')
        expect(postMessage).toHaveBeenCalled()
    })

    it('shows error state when opener reports failure', async () => {
        setPickerEntries([makeWalletPickerEntry()])

        const el = await fixture<WalletPicker>(
            html`<swk-wallet-picker></swk-wallet-picker>`
        )

        window.dispatchEvent(
            new MessageEvent('message', {
                origin: window.location.origin,
                data: {
                    messageType: 'SPLICE_WALLET_PICKER_CONNECT_STATUS',
                    status: 'error',
                    message: 'Connection refused',
                },
            })
        )

        expect(el.shadowRoot!.textContent).toContain('Connection Failed')
        expect(el.shadowRoot!.textContent).toContain('Connection refused')
    })

    it('returns to list view from error by Try Again button', async () => {
        setPickerEntries([makeWalletPickerEntry({ name: 'Retry Wallet' })])

        const el = await fixture<WalletPicker>(
            html`<swk-wallet-picker></swk-wallet-picker>`
        )

        window.dispatchEvent(
            new MessageEvent('message', {
                origin: window.location.origin,
                data: {
                    messageType: 'SPLICE_WALLET_PICKER_CONNECT_STATUS',
                    status: 'error',
                    message: 'Timeout',
                },
            })
        )

        const tryAgain = el.shadowRoot!.querySelector(
            '.btn-primary'
        ) as HTMLButtonElement
        tryAgain.click()

        expect(el.shadowRoot!.textContent).toContain('Retry Wallet')
        expect(el.shadowRoot!.textContent).not.toContain('Failed to connect')
    })

    it('removes a recent gateway entry', async () => {
        setRecentGateways([
            { name: 'Removable GW', rpcUrl: 'http://remove.me' },
        ])

        const el = await fixture<WalletPicker>(
            html`<swk-wallet-picker></swk-wallet-picker>`
        )

        const removeBtn = el.shadowRoot!.querySelector(
            '.wallet-remove-btn'
        ) as HTMLButtonElement
        removeBtn.click()

        expect(el.shadowRoot!.textContent).not.toContain('Removable GW')
        expect(JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]')).toEqual([])
    })

    it('ignores postMessage from foreign origins', async () => {
        setPickerEntries([makeWalletPickerEntry()])

        const el = await fixture<WalletPicker>(
            html`<swk-wallet-picker></swk-wallet-picker>`
        )

        window.dispatchEvent(
            new MessageEvent('message', {
                origin: 'https://xeno.example',
                data: {
                    messageType: 'SPLICE_WALLET_PICKER_CONNECT_STATUS',
                    status: 'error',
                    message: 'Should be ignored',
                },
            })
        )

        expect(el.shadowRoot!.textContent).not.toContain('Failed to connect')
    })
})
