// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { TextField } from '@mui/material'
import { expect, fn } from 'storybook/test'
import { WalletForm } from './WalletForm'

const meta: Meta = {
    title: 'WalletForm',
    component: WalletForm,
    args: {
        submitLabel: 'Add',
        submittingLabel: 'Adding...',
        submittingMessage: 'Creating party, please wait...',
        onSubmit: fn(),
        children: <TextField label="Party hint" fullWidth />,
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await expect(
            canvas.getByRole('textbox', { name: 'Party hint' })
        ).toBeInTheDocument()
        // Nothing is announced while idle
        await expect(canvas.queryByRole('status')).not.toBeInTheDocument()

        await userEvent.click(canvas.getByRole('button', { name: 'Add' }))
        await expect(args.onSubmit).toHaveBeenCalledTimes(1)
    },
}

export const SubmitsWithEnter: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.type(
            canvas.getByRole('textbox', { name: 'Party hint' }),
            'alice{Enter}'
        )
        await expect(args.onSubmit).toHaveBeenCalledTimes(1)
    },
}

export const Submitting: Story = {
    args: { submitting: true },
    play: async ({ args, canvas }) => {
        // The button shows the submitting text, is disabled, and the progress is announced
        const button = canvas.getByRole('button', { name: 'Adding...' })
        await expect(button).toBeDisabled()
        await expect(
            canvas.queryByRole('button', { name: 'Add' })
        ).not.toBeInTheDocument()
        await expect(canvas.getByRole('status')).toHaveTextContent(
            'Creating party, please wait...'
        )
        await expect(args.onSubmit).not.toHaveBeenCalled()
    },
}

export const Loading: Story = {
    args: { loading: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: 'Add' })).toBeDisabled()
    },
}

export const SubmitDisabled: Story = {
    args: { submitDisabled: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: 'Add' })).toBeDisabled()
    },
}

export const DoesNotSubmitWhileDisabled: Story = {
    args: { loading: true },
    play: async ({ args, canvasElement }) => {
        // Even a submit that gets past the disabled button (e.g. programmatic) is ignored
        canvasElement
            .querySelector('form')!
            .dispatchEvent(
                new Event('submit', { bubbles: true, cancelable: true })
            )

        await expect(args.onSubmit).not.toHaveBeenCalled()
    },
}

export const CustomLabels: Story = {
    args: {
        submitLabel: 'Edit',
        submittingLabel: 'Editing...',
        submittingMessage: 'Editing party, please wait...',
    },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: 'Edit' })
        ).toBeInTheDocument()
    },
}
