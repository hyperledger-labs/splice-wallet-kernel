// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'

import './AppHeader'
import { html } from 'lit'

const meta: Meta = {
    title: 'AppHeader',
    component: 'app-header',
}

export default meta

export const Default: StoryObj = {
    args: {
        label: 'App Header',
    },
    render: () =>
        html`<app-header iconSrc="../../images/icon.png"></app-header>`,
}
