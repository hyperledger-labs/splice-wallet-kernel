// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import type { WalletPickerEntry } from '@canton-network/core-types'
import { pickWallet } from './wallet-picker'
import { html } from 'lit'
import '../components/wallet-picker'

const meta: Meta = {
    title: 'Discovery',
}

export default meta

const MOCK_ENTRIES: WalletPickerEntry[] = [
    {
        providerId: 'canton-wallet',
        name: 'Wallet',
        type: 'remote',
        icon: '/images/logos/canton-logo.png',
    },
    {
        providerId: '5n-loop',
        name: '5N Loop Wallet',
        type: 'remote',
        icon: '/images/logos/5n-logo.png',
    },
    {
        providerId: 'bron',
        name: 'Bron',
        type: 'remote',
        icon: '/images/logos/bron-logo.svg',
    },
    {
        providerId: 'fireblocks',
        name: 'Fireblocks',
        type: 'remote',
        icon: '/images/logos/fireblocks-logo.svg',
    },
    // Custom URL wallet - no icon, demonstrates the custom URL input feature
    {
        providerId: 'custom-wallet',
        name: 'Custom wallet 1',
        type: 'remote',
    },
]

const CONTAINER_STYLE =
    'width: 400px; height: 700px; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;'

function seedEntries(entries: WalletPickerEntry[]): void {
    localStorage.setItem(
        'splice_wallet_picker_entries',
        JSON.stringify(entries)
    )
}

export const Default: StoryObj = {
    render: () => {
        seedEntries(MOCK_ENTRIES)
        return html`
            <div style=${CONTAINER_STYLE}>
                <swk-wallet-picker></swk-wallet-picker>
            </div>
        `
    },
}

export const Popup: StoryObj = {
    render: () =>
        html`<button
            class="btn btn-primary"
            @click=${() => pickWallet(MOCK_ENTRIES)}
        >
            Connect Wallet
        </button>`,
}

export const Empty: StoryObj = {
    render: () => {
        localStorage.removeItem('splice_wallet_picker_entries')
        return html`
            <div style=${CONTAINER_STYLE}>
                <swk-wallet-picker></swk-wallet-picker>
            </div>
        `
    },
}
