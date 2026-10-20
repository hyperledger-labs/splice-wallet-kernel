// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, Chip } from '@mui/material'
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

const longLabels = [
    'Signing provider',
    'Identity provider',
    'External transaction ID',
]

export const LongLabels: Story = {
    render: () => (
        <>
            {longLabels.map((label) => (
                <CardDetailRow key={label} label={label} value="value" />
            ))}
        </>
    ),
    play: async ({ canvas }) => {
        // Labels longer than the minimum column width grow instead of truncating
        for (const label of longLabels) {
            const el = canvas.getByText(label)
            await expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth)
        }
    },
}

export const NodeValue: Story = {
    args: {
        label: 'Permissions',
        value: (
            <>
                <Chip label="CanActAs" size="small" />
                <Chip label="CanReadAs" size="small" />
            </>
        ),
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Permissions')).toBeInTheDocument()
        await expect(canvas.getByText('CanActAs')).toBeInTheDocument()
        await expect(canvas.getByText('CanReadAs')).toBeInTheDocument()
    },
}

export const NodeValueWraps: Story = {
    args: {
        label: 'Permissions',
        value: ['CanActAs', 'CanReadAs', 'CanExecuteAs'].map((right) => (
            <Chip key={right} label={right} size="small" />
        )),
    },
    decorators: [
        (Story) => (
            <div style={{ width: 280 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ canvas }) => {
        // Nodes wrap instead of being truncated, and stay inside the row
        const row = canvas.getByText('Permissions').parentElement!
        for (const right of ['CanActAs', 'CanReadAs', 'CanExecuteAs']) {
            const chip = canvas.getByText(right).parentElement!
            await expect(
                chip.getBoundingClientRect().right
            ).toBeLessThanOrEqual(row.getBoundingClientRect().right)
        }
    },
}

export const CustomTitle: Story = {
    args: {
        label: 'Party ID',
        value: 'alice::1220...a1b2c3',
        title: 'alice::1220deadbeefa1b2c3',
    },
    play: async ({ args, canvas }) => {
        await expect(canvas.getByText(args.value as string)).toHaveAttribute(
            'title',
            'alice::1220deadbeefa1b2c3'
        )
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
