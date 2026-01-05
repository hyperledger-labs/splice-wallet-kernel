// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

const meta: Meta = {
    title: 'WalletsSync',
}

export default meta

export const Default: StoryObj = {
    render: () => html`<wg-wallets-sync></wg-wallets-sync>`,
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
