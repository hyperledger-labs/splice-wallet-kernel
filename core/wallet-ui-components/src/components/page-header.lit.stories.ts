// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

const meta: Meta = {
    title: 'PageHeader',
}

export default meta

export const Default: StoryObj = {
    render: () => html`<wg-page-header heading="Parties"></wg-page-header>`,
}

export const WithActions: StoryObj = {
    render: () =>
        html`<wg-page-header heading="Parties">
            <wg-wallets-sync slot="title-suffix"></wg-wallets-sync>
            <button class="btn btn-primary btn-sm rounded-pill" type="button">
                + New
            </button>
        </wg-page-header>`,
}

export const WithBackLink: StoryObj = {
    render: () =>
        html`<wg-page-header heading="Create a new party">
            <wg-back-link></wg-back-link>
        </wg-page-header>`,
}
