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
        const button = canvas.getByRole('button', { name: 'Copy to clipboard' })
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
        const button = canvas.getByRole('button', { name: 'Copy Party ID' })
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
        await waitFor(() => expect(tooltip).toHaveTextContent('Copied'))
    },
}

export const WithoutOnCopy: Story = {
    // Drop the onCopy arg inherited from meta
    render: (args) => <CopyButton value={args.value} />,
    play: async ({ args, canvas, userEvent }) => {
        const button = canvas.getByRole('button', { name: 'Copy to clipboard' })
        await userEvent.click(button)

        await waitFor(() =>
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                args.value
            )
        )
    },
}

export const ClipboardUnavailable: Story = {
    beforeEach: () => {
        // Remember any existing own property so cleanup restores exactly what was there
        const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

        Object.defineProperty(navigator, 'clipboard', {
            value: undefined,
            configurable: true,
        })

        return () => {
            if (original) {
                Object.defineProperty(navigator, 'clipboard', original)
            } else {
                Reflect.deleteProperty(navigator, 'clipboard')
            }
        }
    },
    play: async ({ args, canvas, userEvent }) => {
        // Guard: make sure the override actually took effect
        await expect(navigator.clipboard).toBeUndefined()

        const button = canvas.getByRole('button', { name: 'Copy to clipboard' })
        await userEvent.click(button)

        // Wait for the UI to settle before asserting that something did NOT happen
        await screen.findByRole('tooltip')

        await expect(args.onCopy).not.toHaveBeenCalled()
    },
}

export const EmptyValue: Story = {
    args: {
        value: '',
    },
    play: async ({ args, canvas, userEvent }) => {
        const button = canvas.getByRole('button', { name: 'Copy to clipboard' })
        await userEvent.click(button)

        await screen.findByRole('tooltip')

        await expect(navigator.clipboard.writeText).not.toHaveBeenCalled()
        await expect(args.onCopy).not.toHaveBeenCalled()
    },
}

export const InsideClickableParent: Story = {
    args: {
        onParentClick: fn(),
    },
    render: (args) => (
        <div onClick={args.onParentClick}>
            <CopyButton value={args.value} onCopy={args.onCopy} />
        </div>
    ),
    play: async ({ args, canvas, userEvent }) => {
        const button = canvas.getByRole('button', { name: 'Copy to clipboard' })
        await userEvent.click(button)

        await waitFor(() =>
            expect(args.onCopy).toHaveBeenCalledWith(args.value)
        )
        await expect(args.onParentClick).not.toHaveBeenCalled()
    },
}
