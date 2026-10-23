// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { ApiKeyForm } from './ApiKeyForm'

const meta: Meta = {
    title: 'ApiKeyForm',
    component: ApiKeyForm,
    args: {
        onGenerate: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ args, canvas, userEvent }) => {
        const name = canvas.getByRole('textbox', { name: /^Name/ })
        await expect(name).toBeRequired()
        await expect(name).toHaveValue('')

        await userEvent.type(name, 'New API Key')
        await userEvent.click(canvas.getByRole('button', { name: 'Generate' }))

        await expect(args.onGenerate).toHaveBeenCalledTimes(1)
        await expect(args.onGenerate).toHaveBeenCalledWith({
            name: 'New API Key',
        })
    },
}

export const SubmitsWithEnter: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.type(
            canvas.getByRole('textbox', { name: /^Name/ }),
            'Keyboard key{Enter}'
        )

        await expect(args.onGenerate).toHaveBeenCalledWith({
            name: 'Keyboard key',
        })
    },
}

export const RequiresName: Story = {
    play: async ({ args, canvas, userEvent }) => {
        // The browser blocks submitting an empty required field
        await userEvent.click(canvas.getByRole('button', { name: 'Generate' }))

        await expect(args.onGenerate).not.toHaveBeenCalled()
        await expect(
            canvas.getByRole('textbox', { name: /^Name/ })
        ).toBeInvalid()
    },
}
