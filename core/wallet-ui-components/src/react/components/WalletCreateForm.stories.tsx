// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Key } from '@canton-network/core-wallet-user-rpc-client'
import { Typography } from '@mui/material'
import { expect, fn } from 'storybook/test'
import { WalletCreateForm } from './WalletCreateForm'

const keys: Key[] = [
    { id: 'key-1', name: 'Vault A', publicKey: 'pk1' },
    { id: 'key-2', name: 'Vault B', publicKey: 'pk2' },
]

const meta: Meta = {
    title: 'WalletCreateForm',
    component: WalletCreateForm,
    args: {
        signingProviders: ['participant', 'wallet-kernel', 'fireblocks'],
        onCreate: fn(),
        onSigningProviderChange: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await expect(
            canvas.getByRole('checkbox', { name: 'Set as primary wallet' })
        ).not.toBeChecked()
        await expect(
            canvas.queryByLabelText(/^Vault name/)
        ).not.toBeInTheDocument()

        await userEvent.type(
            canvas.getByRole('textbox', { name: /^Party ID Hint/ }),
            'alice'
        )
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Signing Provider/ }),
            'wallet-kernel'
        )
        await userEvent.click(canvas.getByRole('button', { name: 'Add' }))

        await expect(args.onCreate).toHaveBeenCalledTimes(1)
        await expect(args.onCreate).toHaveBeenCalledWith(
            'alice',
            'wallet-kernel',
            false
        )
    },
}

export const AsPrimary: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.type(
            canvas.getByRole('textbox', { name: /^Party ID Hint/ }),
            'bob'
        )
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Signing Provider/ }),
            'participant'
        )
        await userEvent.click(
            canvas.getByRole('checkbox', { name: 'Set as primary wallet' })
        )
        await userEvent.click(canvas.getByRole('button', { name: 'Add' }))

        await expect(args.onCreate).toHaveBeenCalledWith(
            'bob',
            'participant',
            true
        )
    },
}

export const WithoutPrimaryOption: Story = {
    args: { showPrimary: false },
    play: async ({ canvas }) => {
        await expect(
            canvas.queryByRole('checkbox', { name: 'Set as primary wallet' })
        ).not.toBeInTheDocument()
    },
}

export const SubmitsWithEnter: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Signing Provider/ }),
            'participant'
        )
        await userEvent.type(
            canvas.getByRole('textbox', { name: /^Party ID Hint/ }),
            'carol{Enter}'
        )
        await expect(args.onCreate).toHaveBeenCalledWith(
            'carol',
            'participant',
            false
        )
    },
}

export const RequiresFields: Story = {
    play: async ({ args, canvas, userEvent }) => {
        // The browser blocks submitting empty required fields
        await userEvent.click(canvas.getByRole('button', { name: 'Add' }))

        await expect(args.onCreate).not.toHaveBeenCalled()
        await expect(
            canvas.getByRole('textbox', { name: /^Party ID Hint/ })
        ).toBeInvalid()
    },
}

export const ReportsSigningProviderChange: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Signing Provider/ }),
            'fireblocks'
        )
        await expect(args.onSigningProviderChange).toHaveBeenCalledTimes(1)
        await expect(args.onSigningProviderChange).toHaveBeenCalledWith(
            'fireblocks'
        )
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
        await expect(canvas.getByRole('button', { name: 'Add' })).toBeDisabled()
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
        await expect(canvas.getByRole('button', { name: 'Add' })).toBeDisabled()
    },
}

export const Submitting: Story = {
    args: { submitting: true },
    play: async ({ args, canvas }) => {
        // Every field is locked, and progress is shown
        await expect(
            canvas.getByRole('textbox', { name: /^Party ID Hint/ })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('combobox', { name: /^Signing Provider/ })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('checkbox', { name: 'Set as primary wallet' })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('button', { name: 'Adding...' })
        ).toBeDisabled()
        await expect(canvas.getByRole('status')).toHaveTextContent(
            'Creating party, please wait...'
        )
        await expect(args.onCreate).not.toHaveBeenCalled()
    },
}

export const CustomLabels: Story = {
    args: {
        submitting: true,
        submitLabel: 'Create party',
        submittingLabel: 'Creating party...',
        submittingMessage: 'Hold on, creating the party',
    },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: 'Creating party...' })
        ).toBeDisabled()
        await expect(canvas.getByRole('status')).toHaveTextContent(
            'Hold on, creating the party'
        )
    },
}

export const CustomSubmitLabel: Story = {
    args: { submitLabel: 'Create party' },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: 'Create party' })
        ).toBeInTheDocument()
    },
}

export const VaultSelect: Story = {
    args: { keySigningProviders: ['fireblocks'], publicKeys: keys },
    play: async ({ args, canvas, userEvent }) => {
        const provider = canvas.getByRole('combobox', {
            name: /^Signing Provider/,
        })

        // Only the signing providers that have keys offer a vault
        await userEvent.selectOptions(provider, 'participant')
        await expect(
            canvas.queryByLabelText(/^Vault name/)
        ).not.toBeInTheDocument()

        await userEvent.selectOptions(provider, 'fireblocks')
        const vault = canvas.getByRole('combobox', { name: /^Vault name/ })
        await expect(vault).toBeRequired()
        await expect(
            canvas.getByRole('option', { name: 'Select vault name' })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('option', { name: 'Vault A' })
        ).toBeInTheDocument()

        await userEvent.type(
            canvas.getByRole('textbox', { name: /^Party ID Hint/ }),
            'alice'
        )
        await userEvent.selectOptions(vault, 'Vault B')
        await userEvent.click(canvas.getByRole('button', { name: 'Add' }))

        // The key's name is reported, not its id
        await expect(args.onCreate).toHaveBeenCalledWith(
            'alice',
            'fireblocks',
            false,
            'Vault B'
        )
    },
}

export const VaultResetsWhenSigningProviderChanges: Story = {
    args: {
        keySigningProviders: ['fireblocks', 'dfns'],
        publicKeys: keys,
        signingProviders: ['fireblocks', 'dfns'],
    },
    play: async ({ canvas, userEvent }) => {
        const provider = canvas.getByRole('combobox', {
            name: /^Signing Provider/,
        })
        await userEvent.selectOptions(provider, 'fireblocks')
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Vault name/ }),
            'Vault A'
        )

        // The chosen key belongs to the previous provider
        await userEvent.selectOptions(provider, 'dfns')
        await expect(
            canvas.getByRole('combobox', { name: /^Vault name/ })
        ).toHaveValue('')
    },
}

export const VaultsLoading: Story = {
    args: { keySigningProviders: ['fireblocks'], publicKeys: undefined },
    play: async ({ args, canvas, canvasElement, userEvent }) => {
        await userEvent.type(
            canvas.getByRole('textbox', { name: /^Party ID Hint/ }),
            'alice'
        )
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Signing Provider/ }),
            'fireblocks'
        )

        await expect(
            canvas.getByRole('combobox', { name: /^Vault name/ })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('option', { name: 'Loading vaults...' })
        ).toBeInTheDocument()
        await expect(canvas.getByRole('button', { name: 'Add' })).toBeDisabled()

        // Even a submit that gets past the disabled button is ignored
        canvasElement
            .querySelector('form')!
            .dispatchEvent(
                new Event('submit', { bubbles: true, cancelable: true })
            )
        await expect(args.onCreate).not.toHaveBeenCalled()
    },
}

export const VaultsLoadingForOtherProvidersIsIgnored: Story = {
    args: { keySigningProviders: ['fireblocks'], publicKeys: undefined },
    play: async ({ canvas, userEvent }) => {
        // Vaults only matter for the providers that use them
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Signing Provider/ }),
            'participant'
        )
        await expect(canvas.getByRole('button', { name: 'Add' })).toBeEnabled()
    },
}

export const ControlledSigningProvider: Story = {
    render: (args) => {
        const [provider, setProvider] = useState('fireblocks')
        return (
            <>
                <WalletCreateForm
                    signingProviders={args.signingProviders}
                    keySigningProviders={['fireblocks']}
                    publicKeys={keys}
                    selectedSigningProvider={provider}
                    onSigningProviderChange={(id) => {
                        args.onSigningProviderChange(id)
                        setProvider(id)
                    }}
                    onCreate={args.onCreate}
                />
                <Typography>Selected: {provider}</Typography>
            </>
        )
    },
    play: async ({ args, canvas, userEvent }) => {
        // The parent's selection is what the form shows
        const select = canvas.getByRole('combobox', {
            name: /^Signing Provider/,
        })
        await expect(select).toHaveValue('fireblocks')
        await expect(
            canvas.getByRole('combobox', { name: /^Vault name/ })
        ).toBeInTheDocument()

        await userEvent.selectOptions(select, 'participant')
        await expect(args.onSigningProviderChange).toHaveBeenCalledWith(
            'participant'
        )
        await expect(
            canvas.getByText('Selected: participant')
        ).toBeInTheDocument()
        await expect(
            canvas.queryByLabelText(/^Vault name/)
        ).not.toBeInTheDocument()
    },
}

// What an app does with the form: create the party, and show it is working
const AppContainer = () => {
    const [submitting, setSubmitting] = useState(false)
    const [created, setCreated] = useState('')

    return (
        <>
            <WalletCreateForm
                signingProviders={['participant', 'wallet-kernel']}
                submitLabel="Create party"
                submitting={submitting}
                onCreate={(partyHint, signingProviderId, primary) => {
                    setSubmitting(true)
                    setTimeout(() => {
                        setCreated(
                            `Created ${partyHint} with ${signingProviderId}${primary ? ' as primary' : ''}`
                        )
                        setSubmitting(false)
                    }, 100)
                }}
            />
            {created && <Typography role="status">{created}</Typography>}
        </>
    )
}

export const AppFlow: Story = {
    render: () => <AppContainer />,
    play: async ({ canvas, userEvent }) => {
        await userEvent.type(
            canvas.getByRole('textbox', { name: /^Party ID Hint/ }),
            'alice'
        )
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Signing Provider/ }),
            'wallet-kernel'
        )
        await userEvent.click(
            canvas.getByRole('checkbox', { name: 'Set as primary wallet' })
        )
        await userEvent.click(
            canvas.getByRole('button', { name: 'Create party' })
        )

        await expect(
            canvas.getByRole('button', { name: 'Adding...' })
        ).toBeDisabled()
        await expect(
            await canvas.findByText(
                'Created alice with wallet-kernel as primary'
            )
        ).toBeInTheDocument()
    },
}

export const ExposesE2eHooks: Story = {
    args: { keySigningProviders: ['fireblocks'], publicKeys: keys },
    play: async ({ canvasElement, canvas, userEvent }) => {
        // The helpers scope to the form by this attribute, and use these ids
        const form = canvasElement.querySelector(
            '[data-testid="wallet-create-form"]'
        )!
        await expect(form.querySelector('button[type="submit"]')).not.toBeNull()
        await expect(form.querySelector('input#party-id-hint')).not.toBeNull()
        await expect(
            form.querySelector('select#signing-provider-id')
        ).not.toBeNull()
        await expect(form.querySelector('input#primary')).not.toBeNull()

        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Signing Provider/ }),
            'fireblocks'
        )
        await expect(form.querySelector('select#vault-name')).not.toBeNull()
    },
}
