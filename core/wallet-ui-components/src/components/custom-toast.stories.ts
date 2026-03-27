// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

const meta: Meta = {
    title: 'CustomToast',
}

export default meta

export const Error: StoryObj = {
    render: () => html`
        <custom-toast
            type="error"
            title="Something went wrong"
            message="Could not complete the transaction."
            buttonText="Dismiss"
            style="position: static;"
        ></custom-toast>
    `,
}

export const Success: StoryObj = {
    render: () => html`
        <custom-toast
            type="success"
            title="Success"
            message="Activity approved successfully."
            buttonText="OK"
            style="position: static;"
        ></custom-toast>
    `,
}

export const Info: StoryObj = {
    render: () => html`
        <custom-toast
            type="info"
            title="Heads up"
            message="Tx has been sent to signing provider."
            buttonText="Got it"
            style="position: static;"
        ></custom-toast>
    `,
}
