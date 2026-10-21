// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'
import { MessageDetail } from './MessageDetail'

const message = 'Sign in to Example dApp\nNonce: 12345'

const meta: Meta = {
    title: 'MessageDetail',
    component: MessageDetail,
    args: {
        messageId: 'msg-1',
        message,
        status: 'pending',
        onApprove: fn(),
        onReject: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Pending: Story = {
    args: {
        origin: 'https://dapp.example',
        externalTxId: 'ext-1',
        backHref: '/activities/',
    },
    play: async ({ args, canvas, userEvent }) => {
        await expect(
            canvas.getByRole('heading', { name: 'Message Details' })
        ).toBeInTheDocument()
        await expect(canvas.getByTestId('activity-status')).toHaveTextContent(
            'pending'
        )
        await expect(
            canvas.getByText('https://dapp.example')
        ).toBeInTheDocument()
        await expect(canvas.getByText('ext-1')).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Copy external transaction ID' })
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('link', { name: 'Back' })
        ).toHaveAttribute('href', '/activities/')

        // The message is shown as is, line breaks included
        await expect(
            canvas.getByText(
                (_, el) => el?.tagName === 'PRE' && el.textContent === message
            )
        ).toBeInTheDocument()

        await userEvent.click(canvas.getByRole('button', { name: 'Approve' }))
        await expect(args.onApprove).toHaveBeenCalledTimes(1)
        await expect(args.onApprove).toHaveBeenCalledWith('msg-1')
        await userEvent.click(canvas.getByRole('button', { name: 'Reject' }))
        await expect(args.onReject).toHaveBeenCalledTimes(1)
        await expect(args.onReject).toHaveBeenCalledWith('msg-1')
    },
}

export const Minimal: Story = {
    play: async ({ canvas }) => {
        // The optional rows and the back link are only shown when set
        await expect(canvas.queryByText('Requested by')).not.toBeInTheDocument()
        await expect(
            canvas.queryByText('External transaction ID')
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: /^Copy/ })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('link', { name: 'Back' })
        ).not.toBeInTheDocument()
    },
}

export const WithoutRejectCallback: Story = {
    args: { onReject: undefined },
    play: async ({ canvas }) => {
        await expect(
            canvas.queryByRole('button', { name: 'Reject' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Approve' })
        ).toBeEnabled()
    },
}

export const WithoutActions: Story = {
    render: (args) => (
        <>
            {['signed', 'awaiting-signature', 'failed'].map((status) => (
                <div key={status} data-testid={status}>
                    <MessageDetail
                        messageId="msg-1"
                        message={message}
                        status={status}
                        onApprove={args.onApprove}
                    />
                </div>
            ))}
        </>
    ),
    play: async ({ canvas }) => {
        // Only pending messages have actions, whatever else is going on
        await expect(
            canvas.queryByRole('button', { name: 'Approve' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Reject' })
        ).not.toBeInTheDocument()

        // The status is coloured by tone
        const badge = (id: string) =>
            within(canvas.getByTestId(id)).getByTestId('activity-status')
        await expect(badge('signed')).toHaveClass(/MuiChip-colorSuccess/)
        await expect(badge('awaiting-signature')).toHaveClass(
            /MuiChip-colorWarning/
        )
        await expect(badge('failed')).toHaveClass(/MuiChip-colorError/)
    },
}
