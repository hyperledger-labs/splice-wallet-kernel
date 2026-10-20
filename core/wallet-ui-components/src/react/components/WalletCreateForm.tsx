// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type {
    Key,
    KeyName,
    PartyHint,
    SigningProviderId,
} from '@canton-network/core-wallet-user-rpc-client'
import { Box, Checkbox, FormControlLabel, TextField } from '@mui/material'
import { SigningProviderSelect } from './SigningProviderSelect'
import { WalletForm } from './WalletForm'

interface WalletCreateFormProps {
    /** The signing provider ids to choose from */
    signingProviders: string[]
    /** Disables the form until the signing providers are loaded @default false */
    signingProvidersLoading?: boolean
    /** @default 'Loading signing providers...' */
    signingProvidersLoadingLabel?: string
    /** @default 'No signing providers available' */
    noSigningProvidersLabel?: string
    /** Signing providers whose wallets are created with one of `publicKeys`, chosen in a "Vault name" select @default [] */
    keySigningProviders?: string[]
    /** The keys offered for `keySigningProviders`. Load them when `onSigningProviderChange` reports such a provider */
    publicKeys?: Key[]
    publicKeysLoading?: boolean
    /** The selected signing provider. Pass it, together with `onSigningProviderChange`, to control the selection; without it the form keeps its own */
    selectedSigningProvider?: string
    /** Offers the "Set as primary wallet" checkbox @default true */
    showPrimary?: boolean
    /** Disables the form and shows `submittingLabel` and `submittingMessage` @default false */
    submitting?: boolean
    /** @default 'Add' */
    submitLabel?: string
    /** @default 'Adding...' */
    submittingLabel?: string
    /** @default 'Creating party, please wait...' */
    submittingMessage?: string
    /**
     * Called when the form is submitted. `keyName` is the name of the chosen
     * key, for the signing providers that have keys
     */
    onCreate: (
        partyHint: PartyHint,
        signingProviderId: SigningProviderId,
        primary: boolean,
        keyName?: KeyName
    ) => void
    /** Called when another signing provider is chosen */
    onSigningProviderChange?: (signingProviderId: SigningProviderId) => void
}

export const WalletCreateForm = ({
    signingProviders,
    signingProvidersLoading = false,
    signingProvidersLoadingLabel = 'Loading signing providers...',
    noSigningProvidersLabel = 'No signing providers available',
    keySigningProviders = [],
    publicKeys = [],
    publicKeysLoading = false,
    selectedSigningProvider,
    showPrimary = true,
    submitting = false,
    submitLabel = 'Add',
    submittingLabel = 'Adding...',
    submittingMessage = 'Creating party, please wait...',
    onCreate,
    onSigningProviderChange,
}: WalletCreateFormProps) => {
    const [partyHint, setPartyHint] = useState('')
    const [ownSigningProvider, setOwnSigningProvider] = useState('')
    const [primary, setPrimary] = useState(false)
    const [publicKeyId, setPublicKeyId] = useState('')

    const signingProvider = selectedSigningProvider ?? ownSigningProvider
    const showPublicKeySelect =
        !!signingProvider && keySigningProviders.includes(signingProvider)
    const hasNoSigningProviders =
        !signingProvidersLoading && signingProviders.length === 0
    const loading =
        submitting ||
        signingProvidersLoading ||
        (showPublicKeySelect && publicKeysLoading)

    const changeSigningProvider = (signingProviderId: string) => {
        setOwnSigningProvider(signingProviderId)
        // The key belongs to the previous signing provider
        setPublicKeyId('')
        onSigningProviderChange?.(signingProviderId)
    }

    const handleSubmit = () => {
        if (loading || hasNoSigningProviders) return

        const keyName = publicKeys.find((key) => key.id === publicKeyId)?.name
        if (keyName) {
            onCreate(partyHint, signingProvider, primary, keyName)
        } else {
            onCreate(partyHint, signingProvider, primary)
        }
    }

    return (
        // The e2e helpers scope their queries to the form by this attribute
        <Box data-testid="wallet-create-form" sx={{ height: '100%' }}>
            <WalletForm
                submitLabel={submitLabel}
                submittingLabel={submittingLabel}
                submittingMessage={submittingMessage}
                submitting={submitting}
                loading={loading}
                submitDisabled={hasNoSigningProviders}
                onSubmit={handleSubmit}
            >
                <TextField
                    id="party-id-hint"
                    label="Party ID Hint"
                    required
                    fullWidth
                    placeholder="Enter the name of your wallet?"
                    disabled={submitting}
                    value={partyHint}
                    onChange={(e) => setPartyHint(e.target.value)}
                />

                <SigningProviderSelect
                    signingProviders={signingProviders}
                    value={signingProvider}
                    onChange={changeSigningProvider}
                    loading={signingProvidersLoading}
                    disabled={submitting}
                    loadingLabel={signingProvidersLoadingLabel}
                    noProvidersLabel={noSigningProvidersLabel}
                />

                {showPublicKeySelect && (
                    <TextField
                        id="vault-name"
                        select
                        label="Vault name"
                        required
                        fullWidth
                        disabled={loading}
                        value={publicKeyId}
                        onChange={(e) => setPublicKeyId(e.target.value)}
                        // A native select: it is what screen readers and e2e tests expect
                        slotProps={{
                            select: { native: true },
                            inputLabel: { shrink: true },
                        }}
                    >
                        <option value="" disabled>
                            {loading
                                ? 'Loading vaults...'
                                : 'Select vault name'}
                        </option>
                        {publicKeys.map((key) => (
                            <option key={key.id} value={key.id}>
                                {key.name}
                            </option>
                        ))}
                    </TextField>
                )}

                {showPrimary && (
                    <FormControlLabel
                        label="Set as primary wallet"
                        control={
                            <Checkbox
                                id="primary"
                                checked={primary}
                                disabled={submitting}
                                onChange={(e) => setPrimary(e.target.checked)}
                            />
                        }
                    />
                )}
            </WalletForm>
        </Box>
    )
}
