// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, type ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Auth } from '@canton-network/core-wallet-user-rpc-client'
import { expect, fn } from 'storybook/test'
import { AuthEditor } from './AuthEditor'

const authorizationCode: Auth = {
    method: 'authorization_code',
    clientId: 'client-id',
    audience: 'aud',
    scope: 'scope',
}

const clientCredentials: Auth = {
    method: 'client_credentials',
    clientId: 'client-id',
    audience: 'aud',
    scope: 'scope',
    clientSecret: 'existing-secret',
}

// The editor is controlled: this keeps the auth it reports, like a parent form
const Harness = ({
    initialAuth,
    onChange,
    ...props
}: Omit<ComponentProps<typeof AuthEditor>, 'auth' | 'onChange'> & {
    initialAuth?: Auth | undefined
    onChange: (auth: Auth | undefined) => void
}) => {
    const [auth, setAuth] = useState<Auth | undefined>(initialAuth)
    return (
        <AuthEditor
            {...props}
            auth={auth}
            onChange={(next) => {
                onChange(next)
                setAuth(next)
            }}
        />
    )
}

const meta: Meta = {
    title: 'AuthEditor',
    component: AuthEditor,
    render: (args) => (
        <Harness
            initialAuth={args.initialAuth}
            allowedMethods={args.allowedMethods}
            optional={args.optional}
            {...(args.label !== undefined && { label: args.label })}
            onChange={args.onChange}
        />
    ),
    args: {
        onChange: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Required: Story = {
    play: async ({ args, canvas, userEvent }) => {
        // Without an optional flag the fields are shown straight away
        await expect(
            canvas.getByRole('combobox', { name: /^Method/ })
        ).toHaveValue('authorization_code')
        await expect(
            canvas.queryByRole('button', { name: 'Add' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Cancel' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.getByRole('textbox', { name: /^Client Id/ })
        ).toBeRequired()
        await expect(
            canvas.queryByLabelText(/^Client Secret/)
        ).not.toBeInTheDocument()

        await userEvent.type(
            canvas.getByRole('textbox', { name: /^Client Id/ }),
            'abc'
        )
        await expect(args.onChange).toHaveBeenLastCalledWith({
            method: 'authorization_code',
            clientId: 'abc',
            audience: '',
            scope: '',
        })
    },
}

export const Editing: Story = {
    args: { initialAuth: authorizationCode },
    play: async ({ args, canvas, userEvent }) => {
        const audience = canvas.getByRole('textbox', { name: /^Audience/ })
        await expect(audience).toHaveValue('aud')

        await userEvent.clear(audience)
        await userEvent.type(audience, 'new-aud')
        await expect(args.onChange).toHaveBeenLastCalledWith({
            ...authorizationCode,
            audience: 'new-aud',
        })
        // The edited value is what the controlled field now shows
        await expect(audience).toHaveValue('new-aud')
    },
}

export const SwitchingMethods: Story = {
    args: { initialAuth: authorizationCode },
    play: async ({ args, canvas, userEvent }) => {
        const method = canvas.getByRole('combobox', { name: /^Method/ })

        // Shared fields are carried over, and each method shows its own inputs
        await userEvent.selectOptions(method, 'client_credentials')
        await expect(args.onChange).toHaveBeenLastCalledWith({
            method: 'client_credentials',
            clientId: 'client-id',
            audience: 'aud',
            scope: 'scope',
            clientSecret: '',
        })
        await expect(
            canvas.getByLabelText(/^Client Secret/)
        ).toBeInTheDocument()
        await expect(
            canvas.getByLabelText('Identity Provider Id Override')
        ).toBeInTheDocument()
        await expect(canvas.queryByLabelText(/^Issuer/)).not.toBeInTheDocument()

        await userEvent.selectOptions(method, 'self_signed')
        await expect(canvas.getByLabelText(/^Issuer/)).toBeInTheDocument()
        await expect(
            canvas.getByLabelText(/^Client Secret/)
        ).toBeInTheDocument()
        await expect(
            canvas.queryByLabelText('Identity Provider Id Override')
        ).not.toBeInTheDocument()

        await userEvent.selectOptions(method, 'self_issued')
        await expect(args.onChange).toHaveBeenLastCalledWith({
            method: 'self_issued',
            audience: 'aud',
            scope: 'scope',
        })
        await expect(
            canvas.queryByLabelText(/^Client Id/)
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByLabelText(/^Client Secret/)
        ).not.toBeInTheDocument()
    },
}

export const OnlyAllowedMethods: Story = {
    args: { allowedMethods: ['client_credentials'] },
    play: async ({ canvas }) => {
        // The first allowed method is the default
        const method = canvas.getByRole('combobox', { name: /^Method/ })
        await expect(method).toHaveValue('client_credentials')
        await expect(canvas.getAllByRole('option')).toHaveLength(1)
        await expect(
            canvas.getByLabelText(/^Client Secret/)
        ).toBeInTheDocument()
    },
}

export const UnsupportedMethod: Story = {
    args: {
        initialAuth: {
            method: 'unexpected_method',
            clientId: 'client-id',
            audience: 'aud',
            scope: 'scope',
        },
    },
    play: async ({ args, canvas, userEvent }) => {
        // The unknown method stays visible, with a warning, and can be replaced
        const method = canvas.getByRole('combobox', { name: /^Method/ })
        await expect(method).toHaveValue('unexpected_method')
        await expect(
            canvas.getByText(/Unsupported auth method "unexpected_method"/)
        ).toBeInTheDocument()

        await userEvent.selectOptions(method, 'authorization_code')
        await expect(args.onChange).toHaveBeenLastCalledWith(authorizationCode)
        await expect(
            canvas.queryByText(/Unsupported auth method/)
        ).not.toBeInTheDocument()
    },
}

export const OptionalEmpty: Story = {
    args: { optional: true },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByText('No auth configured.')
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Add' })
        ).toBeInTheDocument()
        await expect(canvas.queryByRole('combobox')).not.toBeInTheDocument()
    },
}

export const OptionalEmptyWithLabel: Story = {
    // The label is worked into the message
    args: { optional: true, label: 'admin auth' },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByText('No admin auth configured.')
        ).toBeInTheDocument()
    },
}

export const AddAndCancel: Story = {
    args: { optional: true, allowedMethods: ['client_credentials'] },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Add' }))

        // Adding starts from the defaults of the first allowed method
        await expect(
            canvas.getByRole('combobox', { name: /^Method/ })
        ).toHaveValue('client_credentials')
        await expect(args.onChange).not.toHaveBeenCalled()

        await userEvent.type(
            canvas.getByRole('textbox', { name: /^Client Id/ }),
            'abc'
        )
        await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }))

        await expect(args.onChange).toHaveBeenLastCalledWith(undefined)
        await expect(
            canvas.getByText('No auth configured.')
        ).toBeInTheDocument()
    },
}

export const Summary: Story = {
    args: {
        optional: true,
        initialAuth: {
            ...clientCredentials,
            identityProviderId: 'machine-idp',
        },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Client Id')).toBeInTheDocument()
        await expect(canvas.getByText('client-id')).toBeInTheDocument()
        // The secret is never shown
        await expect(canvas.getByText('********')).toBeInTheDocument()
        await expect(
            canvas.queryByText('existing-secret')
        ).not.toBeInTheDocument()
        await expect(
            canvas.getByText('Identity Provider Id')
        ).toBeInTheDocument()
        await expect(canvas.getByText('machine-idp')).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Edit' })
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Remove' })
        ).toBeInTheDocument()
        await expect(canvas.queryByRole('combobox')).not.toBeInTheDocument()
    },
}

export const SummaryWithoutSecret: Story = {
    args: {
        optional: true,
        initialAuth: { ...clientCredentials, clientSecret: '' },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('(not set)')).toBeInTheDocument()
    },
}

export const EditAndCancelRestores: Story = {
    args: { optional: true, initialAuth: authorizationCode },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))

        const clientId = canvas.getByRole('textbox', { name: /^Client Id/ })
        await userEvent.clear(clientId)
        await userEvent.type(clientId, 'changed')
        await expect(args.onChange).toHaveBeenLastCalledWith({
            ...authorizationCode,
            clientId: 'changed',
        })

        // Cancelling reports the original again and goes back to the summary
        await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }))
        await expect(args.onChange).toHaveBeenLastCalledWith(authorizationCode)
        await expect(
            canvas.getByRole('button', { name: 'Edit' })
        ).toBeInTheDocument()
        await expect(canvas.getByText('client-id')).toBeInTheDocument()
    },
}

export const RemoveAndRestore: Story = {
    args: {
        optional: true,
        initialAuth: clientCredentials,
        label: 'admin auth',
    },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Remove' }))

        await expect(args.onChange).toHaveBeenLastCalledWith(undefined)
        // The label starts the sentence, so it is capitalised
        await expect(
            canvas.getByText(
                'Admin auth will be removed after submitting this form.'
            )
        ).toBeInTheDocument()

        await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }))
        await expect(args.onChange).toHaveBeenLastCalledWith(clientCredentials)
        await expect(
            canvas.getByRole('button', { name: 'Edit' })
        ).toBeInTheDocument()
    },
}

export const ExistingSecretIsHidden: Story = {
    args: { initialAuth: clientCredentials },
    play: async ({ args, canvas, userEvent }) => {
        const secret = canvas.getByLabelText(/^Client Secret/)
        // The current secret isn't shown, and leaving the field empty keeps it
        await expect(secret).toHaveValue('')
        await expect(secret).toHaveAttribute('placeholder', '********')
        await expect(secret).not.toBeRequired()
        await expect(
            canvas.getByText(
                'Current secret is hidden. Enter a new value to replace it.'
            )
        ).toBeInTheDocument()

        await userEvent.type(secret, 'new-secret')
        await expect(args.onChange).toHaveBeenLastCalledWith({
            ...clientCredentials,
            clientSecret: 'new-secret',
        })
    },
}

export const ClearingReplacementKeepsExistingSecret: Story = {
    args: { optional: true, initialAuth: clientCredentials },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))
        const secret = canvas.getByLabelText(/^Client Secret/)

        await userEvent.type(secret, 'new-secret')
        await userEvent.clear(secret)

        // Back to the secret from before editing
        await expect(args.onChange).toHaveBeenLastCalledWith({
            ...clientCredentials,
            clientSecret: 'existing-secret',
        })
    },
}

export const NewSecretIsRequired: Story = {
    args: { optional: true, allowedMethods: ['client_credentials'] },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Add' }))
        const secret = canvas.getByLabelText(/^Client Secret/)
        await expect(secret).toBeRequired()

        // A secret that was typed and cleared again isn't mistaken for a hidden one
        await userEvent.type(secret, 'abc')
        await userEvent.clear(secret)
        await expect(secret).toHaveAttribute('placeholder', '')
        await expect(
            canvas.queryByText(/Current secret is hidden/)
        ).not.toBeInTheDocument()
        await expect(args.onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ clientSecret: '' })
        )
    },
}

export const IdentityProviderOverride: Story = {
    args: { initialAuth: clientCredentials },
    play: async ({ args, canvas, userEvent }) => {
        const override = canvas.getByLabelText('Identity Provider Id Override')
        await userEvent.type(override, 'machine-idp')
        await expect(args.onChange).toHaveBeenLastCalledWith({
            ...clientCredentials,
            identityProviderId: 'machine-idp',
        })

        // Clearing it removes the override, so the network's provider is used
        await userEvent.clear(override)
        await expect(args.onChange).toHaveBeenLastCalledWith(clientCredentials)
    },
}

export const ExposesE2eHooks: Story = {
    play: async ({ canvasElement }) => {
        // The helpers in wallet-test-utils find the inputs through these attributes
        const hook = (id: string) =>
            canvasElement.querySelector(`[data-test-id="${id}"]`)
        await expect(hook('auth-editor-client-id-input')?.tagName).toBe('INPUT')
        await expect(hook('auth-editor-audience-input')?.tagName).toBe('INPUT')
        await expect(hook('auth-editor-scope-input')?.tagName).toBe('INPUT')
        await expect(hook('auth-editor-method-select')?.tagName).toBe('SELECT')
        await expect(hook('auth-editor-edit-state')).not.toBeNull()
    },
}
