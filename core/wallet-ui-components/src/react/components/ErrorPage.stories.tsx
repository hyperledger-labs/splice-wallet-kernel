// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { ErrorPage } from './ErrorPage'

const meta: Meta = {
    title: 'ErrorPage',
    component: ErrorPage,
    args: {
        onAction: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const BackMode: Story = {
    args: {
        mode: 'back',
        title: 'Unable to load parties',
        message: 'The wallet gateway could not fetch parties for this network.',
    },
    play: async ({ args, canvas, userEvent }) => {
        await expect(
            canvas.getByRole('heading', { level: 1, name: args.title })
        ).toBeInTheDocument()
        await expect(canvas.getByText(args.message)).toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Refresh' })
        ).not.toBeInTheDocument()

        await userEvent.click(canvas.getByRole('button', { name: 'Back' }))
        await expect(args.onAction).toHaveBeenCalledTimes(1)
    },
}

export const RefreshMode: Story = {
    args: {
        mode: 'refresh',
        title: 'Connection lost',
        message: 'Please refresh to reconnect to Wallet Gateway.',
    },
    play: async ({ args, canvas, userEvent }) => {
        await expect(
            canvas.getByRole('heading', { level: 1, name: args.title })
        ).toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Back' })
        ).not.toBeInTheDocument()

        await userEvent.click(canvas.getByRole('button', { name: 'Refresh' }))
        await expect(args.onAction).toHaveBeenCalledTimes(1)
    },
}

export const Defaults: Story = {
    args: {
        mode: 'refresh',
    },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('heading', {
                level: 1,
                name: 'Something went wrong',
            })
        ).toBeInTheDocument()
        await expect(
            canvas.getByText(
                'An unexpected error occurred while loading this page.'
            )
        ).toBeInTheDocument()
    },
}
