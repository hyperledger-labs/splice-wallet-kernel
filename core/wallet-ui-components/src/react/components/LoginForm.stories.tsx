// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type {
    Idp,
    PublicNetwork,
} from '@canton-network/core-wallet-user-rpc-client'
import { Button } from '@mui/material'
import { expect, fn } from 'storybook/test'
import { LoginForm } from './LoginForm'

const oauthIdp: Idp = {
    id: 'idp-oauth',
    type: 'oauth',
    issuer: 'https://issuer.example',
    configUrl: 'https://issuer.example/.well-known/openid-configuration',
}
const selfSignedIdp: Idp = {
    id: 'idp-signed',
    type: 'self_signed',
    issuer: 'https://self-signed.example',
}
const selfIssuedIdp: Idp = { id: 'idp-issued', type: 'self_issued' }
const idps = [oauthIdp, selfSignedIdp, selfIssuedIdp]

const network = (overrides: Partial<PublicNetwork>): PublicNetwork => ({
    id: 'net',
    name: 'Network',
    description: 'A network',
    authMethod: 'authorization_code',
    identityProviderId: 'idp-oauth',
    ledgerApi: 'https://ledger.example',
    ...overrides,
})

const oauthNetwork = network({ id: 'oauth', name: 'OAuth Network' })
const selfSignedNetwork = network({
    id: 'signed',
    name: 'Self-signed Network',
    identityProviderId: 'idp-signed',
    clientId: 'client-1',
})
const selfIssuedNetwork = network({
    id: 'issued',
    name: 'Self-issued Network',
    identityProviderId: 'idp-issued',
})
const clientCredentialsNetwork = network({
    id: 'cc',
    name: 'Client Credentials Network',
    authMethod: 'client_credentials',
})
const networks = [oauthNetwork, selfSignedNetwork, selfIssuedNetwork]

const meta: Meta = {
    title: 'LoginForm',
    component: LoginForm,
    parameters: { layout: 'fullscreen' },
    args: {
        networks,
        idps,
        onConnect: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await expect(
            canvas.getByRole('heading', { name: 'Wallet Gateway' })
        ).toBeInTheDocument()
        await expect(canvas.getByAltText('Canton logo')).toBeInTheDocument()

        // The first network is selected, and there are no extra fields for OAuth
        const select = canvas.getByRole('combobox', {
            name: 'Select a network',
        })
        await expect(select).toHaveValue('oauth')
        await expect(
            canvas.getByText('Selected: OAuth Network')
        ).toBeInTheDocument()
        await expect(
            canvas.queryByLabelText(/Username/)
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByLabelText('Client ID')
        ).not.toBeInTheDocument()

        await userEvent.click(canvas.getByRole('button', { name: 'Connect' }))
        await expect(args.onConnect).toHaveBeenCalledTimes(1)
        await expect(args.onConnect).toHaveBeenCalledWith(
            oauthNetwork,
            oauthIdp
        )
    },
}

export const SelfSigned: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: 'Select a network' }),
            'Self-signed Network'
        )

        // The client ID is prefilled from the network, the secret is masked
        const clientId = canvas.getByLabelText('Client ID')
        await expect(clientId).toHaveValue('client-1')
        const secret = canvas.getByLabelText('Client Secret')
        await expect(secret).toHaveAttribute('type', 'password')

        await userEvent.type(secret, 'network-secret')
        await userEvent.click(canvas.getByRole('button', { name: 'Connect' }))

        await expect(args.onConnect).toHaveBeenCalledWith(
            selfSignedNetwork,
            selfSignedIdp,
            'client-1',
            'network-secret'
        )
    },
}

export const SelfSignedWithOtherClientId: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: 'Select a network' }),
            'Self-signed Network'
        )
        const clientId = canvas.getByLabelText('Client ID')
        await userEvent.clear(clientId)
        await userEvent.type(clientId, 'other-client')
        await userEvent.click(canvas.getByRole('button', { name: 'Connect' }))

        await expect(args.onConnect).toHaveBeenCalledWith(
            selfSignedNetwork,
            selfSignedIdp,
            'other-client',
            ''
        )
    },
}

export const SelfIssued: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: 'Select a network' }),
            'Self-issued Network'
        )
        const username = canvas.getByRole('textbox', { name: /^Username/ })
        await expect(username).toBeRequired()
        await expect(
            canvas.queryByLabelText('Client ID')
        ).not.toBeInTheDocument()

        // Surrounding whitespace is trimmed, and Enter submits
        await userEvent.type(username, '  alice  {Enter}')
        await expect(args.onConnect).toHaveBeenCalledWith(
            selfIssuedNetwork,
            selfIssuedIdp,
            undefined,
            undefined,
            'alice'
        )
    },
}

export const SelfIssuedRequiresUsername: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: 'Select a network' }),
            'Self-issued Network'
        )
        await userEvent.click(canvas.getByRole('button', { name: 'Connect' }))

        // The browser blocks submitting an empty required field
        await expect(args.onConnect).not.toHaveBeenCalled()
        await expect(
            canvas.getByRole('textbox', { name: /^Username/ })
        ).toBeInvalid()
    },
}

export const SelfIssuedOnboarding: Story = {
    args: {
        networks: [
            network({ ...selfIssuedNetwork, authMethod: 'self_issued' }),
        ],
    },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('textbox', { name: /^Username/ })
        ).toBeInTheDocument()
        await expect(
            canvas.queryByLabelText('Client ID')
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByLabelText('Client Secret')
        ).not.toBeInTheDocument()
    },
}

export const SkipsClientCredentialsNetworks: Story = {
    args: { networks: [clientCredentialsNetwork, oauthNetwork] },
    play: async ({ canvas }) => {
        const select = canvas.getByRole('combobox', {
            name: 'Select a network',
        })
        // The first network that can be logged into is selected, not the first one
        await expect(select).toHaveValue('oauth')
        await expect(
            canvas.getByRole('option', { name: 'Client Credentials Network' })
        ).toBeDisabled()
    },
}

export const NothingToSelect: Story = {
    args: { networks: [clientCredentialsNetwork] },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByText('Choose a network to continue.')
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Connect' })
        ).toBeDisabled()
    },
}

export const ChoosingNoNetwork: Story = {
    play: async ({ canvas, userEvent }) => {
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: 'Select a network' }),
            'Select network'
        )

        await expect(
            canvas.getByText('Choose a network to continue.')
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Connect' })
        ).toBeDisabled()
    },
}

export const MisconfiguredIdentityProvider: Story = {
    args: { networks: [network({ identityProviderId: 'missing' })] },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Connect' }))

        await expect(canvas.getByRole('alert')).toHaveTextContent(
            'Identity provider misconfigured for this network.'
        )
        await expect(args.onConnect).not.toHaveBeenCalled()
    },
}

export const IdentityProvidersArriveLate: Story = {
    render: (args) => {
        const [loadedIdps, setLoadedIdps] = useState<Idp[]>([])
        return (
            <>
                <LoginForm
                    networks={[oauthNetwork]}
                    idps={loadedIdps}
                    onConnect={args.onConnect}
                />
                <Button onClick={() => setLoadedIdps(idps)}>Load idps</Button>
            </>
        )
    },
    play: async ({ args, canvas, userEvent }) => {
        // No identity provider yet: connecting is a misconfiguration
        await userEvent.click(canvas.getByRole('button', { name: 'Connect' }))
        await expect(canvas.getByRole('alert')).toHaveTextContent(
            'Identity provider misconfigured'
        )

        await userEvent.click(canvas.getByRole('button', { name: 'Load idps' }))
        await userEvent.click(canvas.getByRole('button', { name: 'Connect' }))
        await expect(args.onConnect).toHaveBeenCalledWith(
            oauthNetwork,
            oauthIdp
        )
    },
}

export const Loading: Story = {
    args: { networks: [], idps: [], loading: true },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByText('Loading networks...')
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('combobox', { name: 'Select a network' })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('button', { name: 'Connect' })
        ).toBeDisabled()
    },
}

export const Connecting: Story = {
    args: { networks: [selfSignedNetwork], connecting: true },
    play: async ({ canvas }) => {
        // Connecting locks the select, the credential fields and the button
        await expect(
            canvas.getByRole('combobox', { name: 'Select a network' })
        ).toBeDisabled()
        await expect(canvas.getByLabelText('Client ID')).toBeDisabled()
        await expect(canvas.getByLabelText('Client Secret')).toBeDisabled()
        await expect(
            canvas.getByRole('button', { name: 'Connecting…' })
        ).toBeDisabled()
    },
}

export const ErrorMessage: Story = {
    args: { message: { type: 'error', text: 'Login failed: bad credentials' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('alert')).toHaveTextContent(
            'Login failed: bad credentials'
        )
        // The message replaces the "Selected" hint
        await expect(canvas.queryByText(/^Selected:/)).not.toBeInTheDocument()
    },
}

export const InfoMessage: Story = {
    args: { message: { type: 'info', text: 'Redirecting...' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('alert')).toHaveTextContent(
            'Redirecting...'
        )
    },
}

export const MessageClearsWhenNetworkChanges: Story = {
    args: { message: { type: 'error', text: 'Login failed' } },
    play: async ({ canvas, userEvent }) => {
        await expect(canvas.getByRole('alert')).toBeInTheDocument()

        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: 'Select a network' }),
            'Self-signed Network'
        )

        await expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
        await expect(
            canvas.getByText('Selected: Self-signed Network')
        ).toBeInTheDocument()
    },
}

export const KeepsSelectionAcrossRefetch: Story = {
    render: (args) => {
        const [current, setCurrent] = useState<PublicNetwork[]>(networks)
        return (
            <>
                <LoginForm
                    networks={current}
                    idps={idps}
                    onConnect={args.onConnect}
                />
                <Button
                    onClick={() =>
                        setCurrent([
                            oauthNetwork,
                            { ...selfIssuedNetwork, name: 'Renamed Network' },
                        ])
                    }
                >
                    Refetch
                </Button>
                <Button onClick={() => setCurrent([oauthNetwork])}>
                    Drop selected
                </Button>
            </>
        )
    },
    play: async ({ canvas, userEvent }) => {
        const select = canvas.getByRole('combobox', {
            name: 'Select a network',
        })
        await userEvent.selectOptions(select, 'Self-issued Network')

        // Still selected after a refetch, now with the refreshed details
        await userEvent.click(canvas.getByRole('button', { name: 'Refetch' }))
        await expect(select).toHaveValue('issued')
        await expect(
            canvas.getByText('Selected: Renamed Network')
        ).toBeInTheDocument()

        // Falls back to the first usable network when it disappears
        await userEvent.click(
            canvas.getByRole('button', { name: 'Drop selected' })
        )
        await expect(select).toHaveValue('oauth')
    },
}
