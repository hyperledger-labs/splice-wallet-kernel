// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { CopyButton } from './CopyButton'
import { fn, expect, screen, spyOn, waitFor } from 'storybook/test'

const meta: Meta = {
    title: 'CopyButton',
    component: CopyButton,
    args: {
        value: 'party::1220abc1234567890',
        onCopy: fn(),
    },
    beforeEach: () => {
        spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ canvas, userEvent }) => {
        // Click on a button and assert that a dialog appears
        const button = canvas.getByRole('button', { name: 'Copy' })
        await userEvent.hover(button)

        const tooltip = await screen.findByRole('tooltip')
        await expect(tooltip).toHaveTextContent('Copy to clipboard')
    },
}

export const InContext: Story = {
    args: {
        label: 'Copy Party ID',
    },
    play: async ({ args, canvas, userEvent }) => {
        const button = canvas.getByRole('button', { name: 'Copy' })
        await userEvent.click(button)

        await waitFor(() =>
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                args.value
            )
        )
        await waitFor(() =>
            expect(args.onCopy).toHaveBeenCalledWith(args.value)
        )

        const tooltip = await screen.findByRole('tooltip')
        await expect(tooltip).toHaveTextContent('Copy Party ID')
    },
}
