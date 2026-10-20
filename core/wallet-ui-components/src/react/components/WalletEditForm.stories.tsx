// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Key } from '@canton-network/core-wallet-user-rpc-client'
import { Button } from '@mui/material'
import { expect, fn } from 'storybook/test'
import { WalletEditForm } from './WalletEditForm'

const keys: Key[] = [
    { id: 'key1', name: 'Key 1', publicKey: 'pk1' },
    { id: 'key2', name: 'Key 2', publicKey: 'pk2' },
]

const meta: Meta = {
    title: 'WalletEditForm',
    component: WalletEditForm,
    args: {
        partyId: 'alice::1220abcd',
        signingProviders: ['participant', 'fireblocks', 'wallet-kernel'],
        publicKeys: keys,
        onEdit: fn(),
        onSigningProviderChange: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ args, canvas, userEvent }) => {
        // The party is shown read-only
        const party = canvas.getByLabelText('Party ID')
        await expect(party).toHaveValue('alice::1220abcd')
        await expect(party).toBeDisabled()
        await expect(party).toHaveAttribute('readonly')

        // Nothing can be submitted before a signing provider is chosen
        await expect(
            canvas.getByRole('button', { name: 'Edit' })
        ).toBeDisabled()

        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Signing Provider/ }),
            'fireblocks'
        )
        // Keys are listed with their public key
        await expect(
            canvas.getByRole('option', { name: 'Key 1 (pk1)' })
        ).toBeInTheDocument()
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Public Key/ }),
            'pk1'
        )
        await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))

        await expect(args.onEdit).toHaveBeenCalledTimes(1)
        await expect(args.onEdit).toHaveBeenCalledWith(
            'alice::1220abcd',
            'fireblocks',
            'pk1'
        )
    },
}

export const Prefilled: Story = {
    args: { selectedSigningProvider: 'fireblocks', selectedPublicKey: 'pk2' },
    play: async ({ args, canvas, userEvent }) => {
        await expect(
            canvas.getByRole('combobox', { name: /^Signing Provider/ })
        ).toHaveValue('fireblocks')
        await expect(
            canvas.getByRole('combobox', { name: /^Public Key/ })
        ).toHaveValue('pk2')

        await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))
        await expect(args.onEdit).toHaveBeenCalledWith(
            'alice::1220abcd',
            'fireblocks',
            'pk2'
        )
    },
}

export const ReportsSigningProviderChange: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Signing Provider/ }),
            'wallet-kernel'
        )
        await expect(args.onSigningProviderChange).toHaveBeenCalledTimes(1)
        await expect(args.onSigningProviderChange).toHaveBeenCalledWith(
            'wallet-kernel'
        )
    },
}

export const ChangingSigningProviderClearsPublicKey: Story = {
    args: { selectedSigningProvider: 'fireblocks', selectedPublicKey: 'pk1' },
    play: async ({ canvas, userEvent }) => {
        await expect(
            canvas.getByRole('combobox', { name: /^Public Key/ })
        ).toHaveValue('pk1')

        // The key belongs to the previous signing provider
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Signing Provider/ }),
            'wallet-kernel'
        )
        await expect(
            canvas.getByRole('combobox', { name: /^Public Key/ })
        ).toHaveValue('')
    },
}

export const DisabledSigningProvider: Story = {
    args: {
        disabledSigningProviders: ['participant'],
        selectedSigningProvider: 'participant',
        selectedPublicKey: 'pk1',
    },
    play: async ({ args, canvas }) => {
        // Listed but not selectable, and a wallet on it can't be submitted as is
        await expect(
            canvas.getByRole('option', { name: 'participant' })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('option', { name: 'fireblocks' })
        ).toBeEnabled()
        await expect(
            canvas.getByRole('option', {
                name: 'Select different signing provider',
            })
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('combobox', { name: /^Public Key/ })
        ).toHaveValue('')
        await expect(
            canvas.getByRole('button', { name: 'Edit' })
        ).toBeDisabled()
        await expect(args.onEdit).not.toHaveBeenCalled()
    },
}

export const RequiresPublicKey: Story = {
    args: { selectedSigningProvider: 'fireblocks' },
    play: async ({ args, canvas, userEvent }) => {
        // The browser blocks submitting without a public key
        await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))

        await expect(args.onEdit).not.toHaveBeenCalled()
        await expect(
            canvas.getByRole('combobox', { name: /^Public Key/ })
        ).toBeInvalid()
    },
}

export const DoesNotSubmitWithoutPublicKey: Story = {
    args: { selectedSigningProvider: 'fireblocks' },
    play: async ({ args, canvasElement }) => {
        // Even a submit that gets past the browser's validation is ignored
        canvasElement
            .querySelector('form')!
            .dispatchEvent(
                new Event('submit', { bubbles: true, cancelable: true })
            )

        await expect(args.onEdit).not.toHaveBeenCalled()
    },
}

export const SigningProvidersLoading: Story = {
    // No list yet: the providers are still being loaded
    args: { signingProviders: undefined },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('combobox', { name: /^Signing Provider/ })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('option', { name: 'Loading signing providers...' })
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Edit' })
        ).toBeDisabled()
    },
}

export const NoSigningProviders: Story = {
    args: { signingProviders: [] },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('option', {
                name: 'No signing providers available',
            })
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Edit' })
        ).toBeDisabled()
    },
}

export const PublicKeysLoading: Story = {
    args: {
        selectedSigningProvider: 'fireblocks',
        // No list yet: the keys are still being loaded
        publicKeys: undefined,
    },
    play: async ({ canvas }) => {
        // Progress is shown next to the key select, and the form can't be submitted yet
        await expect(
            canvas.getByRole('progressbar', { name: 'Loading public keys' })
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Edit' })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('combobox', { name: /^Public Key/ })
        ).toBeEnabled()
    },
}

export const Submitting: Story = {
    args: {
        selectedSigningProvider: 'fireblocks',
        selectedPublicKey: 'pk1',
        submitting: true,
    },
    play: async ({ args, canvas }) => {
        await expect(
            canvas.getByRole('combobox', { name: /^Signing Provider/ })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('combobox', { name: /^Public Key/ })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('button', { name: 'Editing...' })
        ).toBeDisabled()
        await expect(canvas.getByRole('status')).toHaveTextContent(
            'Editing party, please wait...'
        )
        await expect(args.onEdit).not.toHaveBeenCalled()
    },
}

export const CustomLabels: Story = {
    args: {
        submitLabel: 'Switch signing provider',
        submittingLabel: 'Switching...',
        submittingMessage: 'Switching the signing provider',
        selectedSigningProvider: 'fireblocks',
        selectedPublicKey: 'pk1',
    },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: 'Switch signing provider' })
        ).toBeEnabled()
    },
}

// The page loads the wallet after the form is shown, then passes its values in
const LoadingContainer = ({
    onEdit,
}: {
    onEdit: (...args: unknown[]) => void
}) => {
    const [wallet, setWallet] = useState<{ provider: string; key: string }>()
    return (
        <>
            <Button
                onClick={() =>
                    setWallet({ provider: 'fireblocks', key: 'pk2' })
                }
            >
                Load wallet
            </Button>
            <WalletEditForm
                partyId="alice::1220abcd"
                signingProviders={['participant', 'fireblocks']}
                publicKeys={keys}
                {...(wallet && {
                    selectedSigningProvider: wallet.provider,
                    selectedPublicKey: wallet.key,
                })}
                onEdit={onEdit}
            />
        </>
    )
}

export const FollowsTheSelectionPassedIn: Story = {
    render: (args) => <LoadingContainer onEdit={args.onEdit} />,
    play: async ({ args, canvas, userEvent }) => {
        await expect(
            canvas.getByRole('combobox', { name: /^Signing Provider/ })
        ).toHaveValue('')

        await userEvent.click(
            canvas.getByRole('button', { name: 'Load wallet' })
        )

        // The loaded wallet shows up, and can then be changed by the user
        await expect(
            canvas.getByRole('combobox', { name: /^Signing Provider/ })
        ).toHaveValue('fireblocks')
        await expect(
            canvas.getByRole('combobox', { name: /^Public Key/ })
        ).toHaveValue('pk2')

        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Public Key/ }),
            'pk1'
        )
        await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))
        await expect(args.onEdit).toHaveBeenCalledWith(
            'alice::1220abcd',
            'fireblocks',
            'pk1'
        )
    },
}

export const ExposesHooks: Story = {
    play: async ({ canvasElement }) => {
        // The ids the Lit form used
        const tag = (id: string) =>
            canvasElement.querySelector(`#${id}`)?.tagName
        await expect(tag('party-id')).toBe('INPUT')
        await expect(tag('signing-provider-id')).toBe('SELECT')
        await expect(tag('public-key-id')).toBe('SELECT')
    },
}
