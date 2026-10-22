// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ParsedTransactionInfo } from '@canton-network/core-tx-visualizer'
import { expect, fn } from 'storybook/test'
import { TransactionCard } from './TransactionCard'

const parsed: ParsedTransactionInfo = {
    isCreate: false,
    isExercise: true,
    choiceId: 'TransferPreapproval_Send',
    amount: '100.0 CC',
}

const meta: Meta = {
    title: 'TransactionCard',
    component: TransactionCard,
    args: {
        transactionId: 'tx-1',
        commandId: 'cmd-1',
        status: 'pending',
        parsed,
        createdAt: '2025-06-01T12:34:56Z',
        onReview: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await expect(canvas.getByText('cmd-1')).toBeInTheDocument()
        await expect(canvas.getByTestId('activity-status')).toHaveTextContent(
            'pending'
        )
        await expect(
            canvas.getByText('TransferPreapproval_Send')
        ).toBeInTheDocument()
        await expect(canvas.getByText('100.0 CC')).toBeInTheDocument()
        // Only the date and time up to the minute are shown
        await expect(canvas.getByText('2025-06-01 12:34')).toBeInTheDocument()
        await expect(
            canvas.queryByText('External transaction ID')
        ).not.toBeInTheDocument()

        // The e2e helpers locate cards by this accessible name
        await userEvent.click(
            canvas.getByRole('button', { name: 'Open activity cmd-1' })
        )
        await expect(args.onReview).toHaveBeenCalledTimes(1)
        await expect(args.onReview).toHaveBeenCalledWith('tx-1', 'cmd-1')
    },
}

export const WithExternalTxId: Story = {
    args: { externalTxId: 'ext-tx-123' },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByText('External transaction ID')
        ).toBeInTheDocument()
        await expect(canvas.getByText('ext-tx-123')).toBeInTheDocument()
    },
}

export const Executed: Story = {
    args: { status: 'executed' },
    play: async ({ canvas }) => {
        const badge = canvas.getByTestId('activity-status')
        await expect(badge).toHaveTextContent('executed')
        await expect(badge).toHaveClass(/MuiChip-colorSuccess/)
    },
}

export const Pending: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('activity-status')).toHaveClass(
            /MuiChip-colorWarning/
        )
    },
}

export const Failed: Story = {
    args: { status: 'failed' },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('activity-status')).toHaveClass(
            /MuiChip-colorError/
        )
    },
}

export const UnknownStatus: Story = {
    args: { status: '' },
    play: async ({ canvas }) => {
        const badge = canvas.getByTestId('activity-status')
        await expect(badge).toHaveTextContent('Unknown')
        await expect(badge).toHaveClass(/MuiChip-colorDefault/)
    },
}

export const WithoutParsedData: Story = {
    args: { parsed: null, createdAt: null },
    play: async ({ canvas }) => {
        // Action type, created at and amount all fall back to N/A
        await expect(canvas.getAllByText('N/A')).toHaveLength(3)
    },
}

export const Loading: Story = {
    args: { loading: true },
    play: async ({ args, canvas }) => {
        const card = canvas.getByRole('button', { name: 'Open activity cmd-1' })
        await expect(card).toBeDisabled()
        await expect(args.onReview).not.toHaveBeenCalled()
    },
}

export const LongIds: Story = {
    args: {
        commandId: 'cmd-' + 'a'.repeat(80),
        externalTxId: 'ext-' + 'b'.repeat(80),
    },
    decorators: [
        (Story) => (
            <div style={{ width: 360 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ args, canvas }) => {
        // Truncated visually, with the full ID on hover; labels stay in full
        const commandId = canvas.getByText(args.commandId)
        await expect(commandId).toHaveAttribute('title', args.commandId)
        await expect(commandId.scrollWidth).toBeGreaterThan(
            commandId.clientWidth
        )
        const label = canvas.getByText('External transaction ID')
        await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth)
    },
}
