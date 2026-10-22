// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type {
    Key,
    SigningProviderId,
} from '@canton-network/core-wallet-user-rpc-client'
import { CircularProgress, InputAdornment, TextField } from '@mui/material'
import { SigningProviderSelect } from './SigningProviderSelect'
import { WalletForm } from './WalletForm'

interface WalletEditFormProps {
    /** The party being edited, shown read-only */
    partyId: string
    /** The signing provider ids to choose from. `undefined` while they are loading, which disables the form */
    signingProviders?: string[] | undefined
    /** Signing providers that are listed but can't be switched to @default [] */
    disabledSigningProviders?: string[]
    /**
     * The keys of the selected signing provider: load them when
     * `onSigningProviderChange` reports a provider. `undefined` while they are
     * loading, which shows progress and disables submitting. Pass `[]` when
     * the provider has none
     */
    publicKeys?: Key[] | undefined
    /** The selected signing provider. The form follows it whenever it changes, and keeps its own choice in between */
    selectedSigningProvider?: string
    /** The selected public key. The form follows it whenever it changes, and keeps its own choice in between */
    selectedPublicKey?: string
    /** Disables the form and shows `submittingLabel` and `submittingMessage` @default false */
    submitting?: boolean
    /** @default 'Edit' */
    submitLabel?: string
    /** @default 'Editing...' */
    submittingLabel?: string
    /** @default 'Editing party, please wait...' */
    submittingMessage?: string
    /** Called when the form is submitted with a signing provider and one of its public keys */
    onEdit: (
        partyId: string,
        signingProviderId: SigningProviderId,
        publicKey: Key['publicKey']
    ) => void
    /** Called when another signing provider is chosen */
    onSigningProviderChange?: (signingProviderId: SigningProviderId) => void
}

export const WalletEditForm = ({
    partyId,
    signingProviders,
    disabledSigningProviders = [],
    publicKeys,
    selectedSigningProvider,
    selectedPublicKey,
    submitting = false,
    submitLabel = 'Edit',
    submittingLabel = 'Editing...',
    submittingMessage = 'Editing party, please wait...',
    onEdit,
    onSigningProviderChange,
}: WalletEditFormProps) => {
    const [signingProvider, setSigningProvider] = useState(
        selectedSigningProvider ?? ''
    )
    const [publicKey, setPublicKey] = useState(selectedPublicKey ?? '')
    const [providerProp, setProviderProp] = useState(selectedSigningProvider)
    const [keyProp, setKeyProp] = useState(selectedPublicKey)

    // Follow the selections the caller passes in, e.g. once the wallet is loaded
    if (selectedSigningProvider !== providerProp) {
        setProviderProp(selectedSigningProvider)
        setSigningProvider(selectedSigningProvider ?? '')
    }
    if (selectedPublicKey !== keyProp) {
        setKeyProp(selectedPublicKey)
        setPublicKey(selectedPublicKey ?? '')
    }

    const hasNoSigningProviders = signingProviders?.length === 0
    const publicKeysLoading = publicKeys === undefined
    const providerIsDisabled =
        disabledSigningProviders.includes(signingProvider)
    const loading = submitting || signingProviders === undefined

    const changeSigningProvider = (signingProviderId: string) => {
        setSigningProvider(signingProviderId)
        // The key belongs to the previous signing provider
        setPublicKey('')
        onSigningProviderChange?.(signingProviderId)
    }

    const handleSubmit = () => {
        if (loading || !publicKey || !signingProvider) return
        onEdit(partyId, signingProvider, publicKey)
    }

    return (
        <WalletForm
            submitLabel={submitLabel}
            submittingLabel={submittingLabel}
            submittingMessage={submittingMessage}
            submitting={submitting}
            loading={loading}
            submitDisabled={
                hasNoSigningProviders ||
                !signingProvider ||
                providerIsDisabled ||
                publicKeysLoading
            }
            onSubmit={handleSubmit}
        >
            <TextField
                id="party-id"
                label="Party ID"
                fullWidth
                disabled
                value={partyId}
                slotProps={{ htmlInput: { readOnly: true } }}
            />

            <SigningProviderSelect
                signingProviders={signingProviders}
                value={signingProvider}
                onChange={changeSigningProvider}
                disabled={submitting}
                disabledProviders={disabledSigningProviders}
            />

            <TextField
                id="public-key-id"
                select
                label="Public Key"
                required
                fullWidth
                disabled={submitting}
                // A key doesn't carry over to a provider that can't be chosen
                value={providerIsDisabled ? '' : publicKey}
                onChange={(e) => setPublicKey(e.target.value)}
                // A native select: it is what screen readers and e2e tests expect
                slotProps={{
                    select: { native: true },
                    inputLabel: { shrink: true },
                    ...(publicKeysLoading && {
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <CircularProgress
                                        size={16}
                                        aria-label="Loading public keys"
                                    />
                                </InputAdornment>
                            ),
                        },
                    }),
                }}
            >
                <option value="" disabled>
                    {publicKeysLoading
                        ? ''
                        : providerIsDisabled
                          ? 'Select different signing provider'
                          : 'Select public key'}
                </option>
                {publicKeys?.map((key) => (
                    <option key={key.publicKey} value={key.publicKey}>
                        {key.name} ({key.publicKey})
                    </option>
                ))}
            </TextField>
        </WalletForm>
    )
}
