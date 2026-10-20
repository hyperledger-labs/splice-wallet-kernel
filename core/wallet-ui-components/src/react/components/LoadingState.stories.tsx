// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'
import { LoadingState } from './LoadingState'

const meta: Meta<typeof LoadingState> = {
    title: 'LoadingState',
    component: LoadingState,
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('status')).toHaveTextContent('Loading')
    },
}

export const Connecting: Story = {
    args: { text: 'Connecting to wallet' },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('status')).toHaveTextContent(
            'Connecting to wallet'
        )
        await expect(canvas.queryByText('Loading')).not.toBeInTheDocument()
    },
}
