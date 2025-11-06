// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

const meta: Meta = {
    title: 'Wallets',
}

export default meta

export const Default: StoryObj = {
    render: () => html`<wg-wallets></wg-wallets>`,
}

export const SyncError: StoryObj = {
    render: () =>
        html`<wg-wallets
            .client=${{
                request: async () => {
                    throw new Error('Test error')
                },
            }}
        ></wg-wallets>`,
}
