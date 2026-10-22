// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, type SubmitEvent } from 'react'
import type {
    Idp,
    PublicNetwork,
} from '@canton-network/core-wallet-user-rpc-client'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import cantonLogo from '../../../images/logos/canton-logo.png'

export interface LoginFormMessage {
    type: 'error' | 'info'
    text: string
}

interface LoginFormProps {
    /** Available networks to show in the dropdown */
    networks: PublicNetwork[]
    /** Available identity providers */
    idps: Idp[]
    /** Locks the form until the networks and identity providers are loaded */
    loading?: boolean
    /** Locks the form while the caller is connecting */
    connecting?: boolean
    /**
     * A status message from the caller, e.g. a failed login. Pass a new object
     * for each message: the form hides it when the user changes the network and
     * shows the next one
     */
    message?: LoginFormMessage | null
    /**
     * Called when the form is submitted for a valid network and identity
     * provider. `clientId` and `clientSecret` are set for self-signed identity
     * providers, `username` for self-issued ones
     */
    onConnect: (
        selectedNetwork: PublicNetwork,
        selectedIdp: Idp,
        clientId?: string,
        clientSecret?: string,
        username?: string
    ) => void
}

const isSelectable = (network: PublicNetwork) =>
    network.authMethod !== 'client_credentials'

export const LoginForm = ({
    networks,
    idps,
    loading = false,
    connecting = false,
    message = null,
    onConnect,
}: LoginFormProps) => {
    // undefined: the user hasn't chosen, so the first usable network is used.
    // null: the user chose "Select network", so nothing is selected
    const [selectedId, setSelectedId] = useState<string | null | undefined>()
    // null: use the selected network's own client ID
    const [clientIdOverride, setClientIdOverride] = useState<string | null>(
        null
    )
    const [clientSecret, setClientSecret] = useState('')
    const [username, setUsername] = useState('')
    const [formError, setFormError] = useState<string | null>(null)
    const [dismissedMessage, setDismissedMessage] =
        useState<LoginFormMessage | null>(null)

    // Keeps the selection across a refetch of the networks, with refreshed
    // details. If the selected network is gone or unusable, falls back to the
    // first usable one
    const current = networks.find((network) => network.id === selectedId)
    const selectedNetwork =
        selectedId === null
            ? null
            : current && isSelectable(current)
              ? current
              : (networks.find(isSelectable) ?? null)

    const selectedIdp =
        idps.find((idp) => idp.id === selectedNetwork?.identityProviderId) ??
        null

    const showUsername =
        selectedIdp?.type === 'self_issued' ||
        selectedNetwork?.authMethod === 'self_issued'
    const showClientCredentials =
        !showUsername && selectedIdp?.type === 'self_signed'

    const shownMessage: LoginFormMessage | null = formError
        ? { type: 'error', text: formError }
        : message && message !== dismissedMessage
          ? message
          : null

    const handleNetworkChange = (id: string) => {
        setSelectedId(id === '' ? null : id)
        setClientIdOverride(null)
        setFormError(null)
        setDismissedMessage(message)
    }

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault()
        setFormError(null)
        setDismissedMessage(message)

        if (!selectedNetwork) {
            setFormError('Please select a network before connecting.')
            return
        }
        if (!selectedIdp) {
            setFormError('Identity provider misconfigured for this network.')
            return
        }

        if (selectedIdp.type === 'self_signed') {
            onConnect(
                selectedNetwork,
                selectedIdp,
                clientIdOverride || selectedNetwork.clientId,
                clientSecret
            )
        } else if (selectedIdp.type === 'self_issued') {
            onConnect(
                selectedNetwork,
                selectedIdp,
                undefined,
                undefined,
                username.trim()
            )
        } else {
            onConnect(selectedNetwork, selectedIdp)
        }
    }

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{
                minHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                sx={{
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    px: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                }}
            >
                <img
                    src={cantonLogo}
                    alt="Canton logo"
                    width={24}
                    height={24}
                    style={{ objectFit: 'contain' }}
                />
            </Box>

            <Stack spacing={2} sx={{ flex: 1, px: 2, pt: 2 }}>
                <Typography
                    variant="h5"
                    component="h1"
                    sx={{ fontWeight: 'bold' }}
                >
                    Wallet Gateway
                </Typography>

                {/* A native select: it is what screen readers and e2e tests expect */}
                <TextField
                    select
                    fullWidth
                    label="Select a network"
                    value={selectedNetwork?.id ?? ''}
                    disabled={loading || connecting}
                    onChange={(e) => handleNetworkChange(e.target.value)}
                    slotProps={{
                        select: { native: true },
                        inputLabel: { shrink: true },
                    }}
                >
                    <option value="">Select network</option>
                    {networks.map((network) => (
                        <option
                            key={network.id}
                            value={network.id}
                            disabled={!isSelectable(network)}
                        >
                            {network.name}
                        </option>
                    ))}
                </TextField>

                {showUsername && (
                    <TextField
                        fullWidth
                        required
                        label="Username"
                        autoComplete="username"
                        value={username}
                        disabled={connecting}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                )}

                {showClientCredentials && (
                    <>
                        <TextField
                            fullWidth
                            label="Client ID"
                            autoComplete="username"
                            value={
                                clientIdOverride ??
                                selectedNetwork?.clientId ??
                                ''
                            }
                            disabled={connecting}
                            onChange={(e) =>
                                setClientIdOverride(e.target.value)
                            }
                        />
                        <TextField
                            fullWidth
                            label="Client Secret"
                            type="password"
                            autoComplete="current-password"
                            value={clientSecret}
                            disabled={connecting}
                            onChange={(e) => setClientSecret(e.target.value)}
                        />
                    </>
                )}

                {shownMessage ? (
                    <Alert severity={shownMessage.type}>
                        {shownMessage.text}
                    </Alert>
                ) : (
                    <Typography variant="body2" color="text.secondary">
                        {loading
                            ? 'Loading networks...'
                            : selectedNetwork
                              ? `Selected: ${selectedNetwork.name}`
                              : 'Choose a network to continue.'}
                    </Typography>
                )}
            </Stack>

            <Box sx={{ p: 2 }}>
                <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading || connecting || !selectedNetwork}
                >
                    {connecting ? 'Connecting…' : 'Connect'}
                </Button>
            </Box>
        </Box>
    )
}
