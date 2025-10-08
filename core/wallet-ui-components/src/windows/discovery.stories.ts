// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'

import '../components/Discovery'
import '../../themes/default.css'
import { discover } from './discovery'

import { html } from 'lit'

const meta: Meta = {
    title: 'Discovery',
}

export default meta

export const Default: StoryObj = {
    args: {
        walletExtensionLoaded: false,
    },
    argTypes: {
        walletExtensionLoaded: {
            control: 'boolean',
            description:
                'Set to true if the wallet extension is loaded, false otherwise.',
            defaultValue: false,
        },
    },

    render: ({ walletExtensionLoaded }) =>
        walletExtensionLoaded
            ? html`<swk-discovery wallet-extension-loaded></swk-discovery>`
            : html`<swk-discovery></swk-discovery>`,
}

export const Popup: StoryObj = {
    render: () => html`<button @click=${discover}>connect</button>`,
}
