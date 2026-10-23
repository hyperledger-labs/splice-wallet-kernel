// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { makeWallet } from './__tests__/fixtures.js'

const meta: Meta = {
    title: 'WalletList',
}

export default meta

const wallets = [
    makeWallet({
        partyId: 'pending::ns',
        hint: 'pending',
        status: 'initialized',
    }),
    makeWallet({
        partyId: 'alice::ns',
        hint: 'alice',
        primary: true,
        signingProviderId: 'participant',
    }),
    makeWallet({
        partyId: 'bob::ns',
        hint: 'bob',
        signingProviderId: 'fireblocks',
    }),
]

export const Default: StoryObj = {
    render: () =>
        html`<wg-wallet-list
            .wallets=${wallets}
            nonEditableSigningProviderId="participant"
        ></wg-wallet-list>`,
}

export const Loading: StoryObj = {
    render: () => html`<wg-wallet-list></wg-wallet-list>`,
}

export const ActionInFlight: StoryObj = {
    render: () =>
        html`<wg-wallet-list .wallets=${wallets} loading></wg-wallet-list>`,
}
