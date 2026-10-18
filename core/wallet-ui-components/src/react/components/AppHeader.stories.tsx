// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { AppHeader } from './AppHeader'

const meta: Meta = {
    title: 'AppHeader',
    component: AppHeader,
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    args: {
        networkName: 'DevNet',
        networkConnected: true,
    },
}

export const Disconnected: Story = {
    args: {
        networkName: undefined,
        networkConnected: false,
    },
}
