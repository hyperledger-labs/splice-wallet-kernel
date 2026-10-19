// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

const meta: Meta = {
    title: 'ErrorPage',
}

export default meta

export const BackMode: StoryObj = {
    render: () => html`
        <wg-error-page
            mode="back"
            title="Unable to load parties"
            message="The wallet gateway could not fetch parties for this network."
            .performDefaultAction=${false}
            @error-back=${() => console.log('back clicked')}
        ></wg-error-page>
    `,
}

export const RefreshMode: StoryObj = {
    render: () => html`
        <wg-error-page
            mode="refresh"
            title="Connection lost"
            message="Please refresh to reconnect to Wallet Gateway."
            .performDefaultAction=${false}
            @error-refresh=${() => console.log('refresh clicked')}
        ></wg-error-page>
    `,
}
