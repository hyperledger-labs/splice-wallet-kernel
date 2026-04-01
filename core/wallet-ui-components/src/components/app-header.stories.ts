// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'

import { html } from 'lit'

const meta: Meta = {
    title: 'AppHeader',
}

export default meta

export const Default: StoryObj = {
    render: () =>
        html`<app-header
            networkName="DevNet"
            .networkConnected=${true}
            currentPage="Parties"
        ></app-header>`,
}

export const Disconnected: StoryObj = {
    render: () =>
        html`<app-header
            networkName="No network connected"
            .networkConnected=${false}
            currentPage="Login"
        ></app-header>`,
}
