// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

const meta: Meta = {
    title: 'WalletsSync',
}

export default meta

export const Default: StoryObj = {
    render: () =>
        html`<wg-wallets-sync
            .client=${{
                request: async (method: string) => {
                    if (method === 'isWalletSyncNeeded') {
                        return { walletSyncNeeded: false }
                    }
                    if (method === 'syncWallets') {
                        return {
                            added: [],
                            removed: [],
                        }
                    }
                },
            }}
        ></wg-wallets-sync>`,
}

export const SyncNeeded: StoryObj = {
    render: () =>
        html`<wg-wallets-sync
            .client=${{
                request: async (method: string) => {
                    if (method === 'isWalletSyncNeeded') {
                        return { walletSyncNeeded: true }
                    }
                    if (method === 'syncWallets') {
                        return {
                            added: [],
                            removed: [],
                        }
                    }
                },
            }}
        ></wg-wallets-sync>`,
}

export const Loading: StoryObj = {
    render: () =>
        html`<wg-wallets-sync
            .client=${{
                request: async (method: string) => {
                    if (method === 'isWalletSyncNeeded') {
                        return { walletSyncNeeded: true }
                    }
                    if (method === 'syncWallets') {
                        // Simulate a long-running sync
                        await new Promise((resolve) =>
                            setTimeout(resolve, 5000)
                        )
                        return {
                            added: [],
                            removed: [],
                        }
                    }
                },
            }}
        ></wg-wallets-sync>`,
}

export const SyncWithDisabledWallets: StoryObj = {
    render: () =>
        html`<wg-wallets-sync
            .client=${{
                request: async (method: string) => {
                    if (method === 'isWalletSyncNeeded') {
                        return { walletSyncNeeded: true }
                    }
                    if (method === 'syncWallets') {
                        return {
                            added: [
                                {
                                    partyId: 'party1',
                                    disabled: false,
                                },
                                {
                                    partyId: 'party2',
                                    disabled: true,
                                },
                                {
                                    partyId: 'party3',
                                    disabled: true,
                                },
                            ],
                            removed: [],
                        }
                    }
                },
            }}
        ></wg-wallets-sync>`,
}

export const SyncError: StoryObj = {
    render: () =>
        html`<wg-wallets-sync
            .client=${{
                request: async () => {
                    throw new Error('Test error')
                },
            }}
        ></wg-wallets-sync>`,
}
