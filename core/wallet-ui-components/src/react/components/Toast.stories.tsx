// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, waitFor, within } from 'storybook/test'
import { Toast } from './Toast'

const meta: Meta = {
    title: 'Toast',
    component: Toast,
    args: {
        title: 'Something went wrong',
        message: 'Could not complete the transaction.',
        autoHideDuration: 60_000,
        onExited: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Error: Story = {
    args: { type: 'error' },
    play: async ({ canvas }) => {
        // Errors are announced assertively
        const alert = await canvas.findByRole('alert')
        await expect(alert).toHaveTextContent('Something went wrong')
        await expect(alert).toHaveTextContent(
            'Could not complete the transaction.'
        )
        await expect(
            within(alert).getByRole('button', { name: 'Dismiss notification' })
        ).toBeInTheDocument()
    },
}

export const Success: Story = {
    args: {
        type: 'success',
        title: 'Wallet sync complete',
        message: '4 added, 2 updated, 2 disabled.',
        buttonText: 'Close notification',
    },
    play: async ({ canvas }) => {
        // Non-errors are polite status messages
        const status = await canvas.findByRole('status')
        await expect(status).toHaveTextContent('Wallet sync complete')
        await expect(status).toHaveTextContent(
            '4 added, 2 updated, 2 disabled.'
        )
        await expect(
            within(status).getByRole('button', { name: 'Close notification' })
        ).toBeInTheDocument()
        await expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
    },
}

export const Info: Story = {
    args: {
        type: 'info',
        title: 'Heads up',
        message: 'Transaction has been sent to signing provider.',
    },
    play: async ({ canvas }) => {
        await expect(await canvas.findByRole('status')).toHaveTextContent(
            'Heads up'
        )
    },
}

export const DefaultsToError: Story = {
    play: async ({ canvas }) => {
        await expect(await canvas.findByRole('alert')).toBeInTheDocument()
    },
}

export const DismissedByButton: Story = {
    args: { type: 'info' },
    play: async ({ args, canvas, userEvent }) => {
        const status = await canvas.findByRole('status')
        await expect(args.onExited).not.toHaveBeenCalled()

        await userEvent.click(
            within(status).getByRole('button', { name: 'Dismiss notification' })
        )
        // Reported once the exit animation has finished
        await waitFor(() => expect(args.onExited).toHaveBeenCalledTimes(1))
        await expect(canvas.queryByRole('status')).not.toBeInTheDocument()
    },
}

export const DismissedAutomatically: Story = {
    args: { type: 'info', autoHideDuration: 200 },
    decorators: [
        (Story) => (
            // The timer pauses while the pointer is over the toast, and the
            // test browser's pointer rests at the page origin. Keep clear of it
            <div style={{ paddingTop: 200 }}>
                <Story />
            </div>
        ),
    ],
    play: async ({ args, canvas }) => {
        const status = await canvas.findByRole('status')

        await waitFor(() => expect(args.onExited).toHaveBeenCalledTimes(1))
        await expect(status).not.toBeInTheDocument()
    },
}
