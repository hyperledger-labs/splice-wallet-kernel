// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@mui/material'
import { expect, fn } from 'storybook/test'
import { CardDetailRow } from './CardDetailRow'

const meta: Meta<typeof CardDetailRow> = {
    title: 'CardDetailRow',
    component: CardDetailRow,
    args: {
        label: 'ID',
        value: 'canton:devnet',
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByText('ID')).toBeInTheDocument()
        await expect(canvas.getByText('canton:devnet')).toBeInTheDocument()
        await expect(canvas.queryByRole('button')).not.toBeInTheDocument()
    },
}

export const Muted: Story = {
    args: { label: 'Access Token', value: '[private]', muted: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Access Token')).toBeInTheDocument()
        await expect(canvas.getByText('[private]')).toBeInTheDocument()
    },
}

const onAction = fn()

export const WithAction: Story = {
    args: {
        label: 'Issuer',
        value: 'https://issuer.example',
        action: <Button onClick={onAction}>Copy</Button>,
    },
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Copy' }))
        await expect(onAction).toHaveBeenCalledTimes(1)
    },
}

export const LongValue: Story = {
    args: {
        label: 'Synchronizer',
        value: 'global-domain::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a',
    },
    decorators: [
        (Story) => (
            <div style={{ width: 300 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ args, canvas }) => {
        // Truncated visually, with the full value available on hover
        const value = canvas.getByText(args.value as string)
        await expect(value).toHaveAttribute('title', args.value)
        await expect(value.scrollWidth).toBeGreaterThan(value.clientWidth)
    },
}
