// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { BackLink } from './BackLink'

const meta: Meta = {
    title: 'BackLink',
    component: BackLink,
}

export default meta

type Story = StoryObj<typeof meta>

export const AsLink: Story = {
    args: { href: '/parties/' },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('link', { name: 'Back' })
        ).toHaveAttribute('href', '/parties/')
        await expect(
            canvas.queryByRole('button', { name: 'Back' })
        ).not.toBeInTheDocument()
    },
}

export const AsButton: Story = {
    args: { onClick: fn() },
    play: async ({ args, canvas, userEvent }) => {
        await expect(
            canvas.queryByRole('link', { name: 'Back' })
        ).not.toBeInTheDocument()

        await userEvent.click(canvas.getByRole('button', { name: 'Back' }))
        await expect(args.onClick).toHaveBeenCalledTimes(1)
    },
}

export const CustomLabel: Story = {
    args: { href: '/transactions/', label: 'Back to transactions' },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('link', { name: 'Back to transactions' })
        ).toHaveAttribute('href', '/transactions/')
    },
}
