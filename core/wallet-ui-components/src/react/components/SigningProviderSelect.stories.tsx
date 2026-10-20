// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn } from 'storybook/test'
import { SigningProviderSelect } from './SigningProviderSelect'

const meta: Meta = {
    title: 'SigningProviderSelect',
    component: SigningProviderSelect,
    args: {
        signingProviders: ['participant', 'wallet-kernel', 'fireblocks'],
        value: '',
        onChange: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ args, canvas, userEvent }) => {
        const select = canvas.getByRole('combobox', {
            name: /^Signing Provider/,
        })
        await expect(select).toBeRequired()
        await expect(select).toHaveValue('')
        await expect(
            canvas.getByRole('option', { name: 'Select signing provider' })
        ).toBeDisabled()

        await userEvent.selectOptions(select, 'wallet-kernel')
        await expect(args.onChange).toHaveBeenCalledTimes(1)
        await expect(args.onChange).toHaveBeenCalledWith('wallet-kernel')
    },
}

export const Selected: Story = {
    args: { value: 'fireblocks' },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('combobox', { name: /^Signing Provider/ })
        ).toHaveValue('fireblocks')
    },
}

export const Controlled: Story = {
    render: (args) => {
        const [value, setValue] = useState('')
        return (
            <SigningProviderSelect
                signingProviders={args.signingProviders}
                value={value}
                onChange={(id) => {
                    args.onChange(id)
                    setValue(id)
                }}
            />
        )
    },
    play: async ({ canvas, userEvent }) => {
        const select = canvas.getByRole('combobox', {
            name: /^Signing Provider/,
        })
        await userEvent.selectOptions(select, 'participant')
        await expect(select).toHaveValue('participant')
    },
}

export const Loading: Story = {
    // No list yet: the providers are still being loaded
    args: { signingProviders: undefined },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('combobox', { name: /^Signing Provider/ })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('option', { name: 'Loading signing providers...' })
        ).toBeInTheDocument()
    },
}

export const NoProviders: Story = {
    args: { signingProviders: [] },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('combobox', { name: /^Signing Provider/ })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('option', {
                name: 'No signing providers available',
            })
        ).toBeInTheDocument()
    },
}

export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('combobox', { name: /^Signing Provider/ })
        ).toBeDisabled()
    },
}

export const DisabledProviders: Story = {
    args: { disabledProviders: ['participant'] },
    play: async ({ canvas }) => {
        // Listed, but can't be chosen
        await expect(
            canvas.getByRole('option', { name: 'participant' })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('option', { name: 'wallet-kernel' })
        ).toBeEnabled()
    },
}

export const ExposesE2eHooks: Story = {
    play: async ({ canvasElement }) => {
        // The Lit form's id, and a native select that selectOption works on
        await expect(
            canvasElement.querySelector('select#signing-provider-id')
        ).not.toBeNull()
    },
}
