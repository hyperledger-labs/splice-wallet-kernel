// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    memo,
    useCallback,
    useId,
    useState,
    type ReactNode,
    type SubmitEvent,
} from 'react'
import type { Auth, Network } from '@canton-network/core-wallet-user-rpc-client'
import {
    Alert,
    Box,
    Button,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import { AuthEditor, type AuthMethod } from './AuthEditor'

// Each editor keeps its own state, so they are skipped when other fields of the
// form change
const MemoizedAuthEditor = memo(AuthEditor)

const SERVICE_ACCOUNT_METHODS: AuthMethod[] = ['client_credentials']

const EMPTY_NETWORK: Network = {
    id: '',
    name: '',
    description: '',
    identityProviderId: '',
    ledgerApi: '',
    auth: {
        method: 'authorization_code',
        audience: '',
        scope: '',
        clientId: '',
    },
}

const isUrl = (value: string) => {
    try {
        new URL(value)
        return true
    } catch {
        return false
    }
}

// The checks the backend would otherwise reject the network for, beyond the
// fields being filled in
type FieldErrors = {
    synchronizerId?: string | undefined
    ledgerApi?: string | undefined
}

const validate = (network: Network): FieldErrors => ({
    synchronizerId:
        !network.synchronizerId ||
        (network.synchronizerId.includes('::') &&
            network.synchronizerId.length >= 10)
            ? undefined
            : 'Must contain "::" and be at least 10 characters',
    ledgerApi: isUrl(network.ledgerApi) ? undefined : 'Must be a valid URL',
})

interface SectionProps {
    title: string
    children: ReactNode
}

const Section = ({ title, children }: SectionProps) => {
    const titleId = useId()
    return (
        <Box component="section" aria-labelledby={titleId}>
            <Typography
                id={titleId}
                variant="subtitle1"
                component="h3"
                sx={{ fontWeight: 'bold', mb: 1 }}
            >
                {title}
            </Typography>
            {children}
        </Box>
    )
}

interface NetworkFormProps {
    /**
     * The network to review and edit. Leave it out to add a new one. The form
     * starts over whenever a different object is passed
     */
    network?: Network | undefined
    /** Called with the entered network when the form is submitted */
    onSave: (network: Network) => void
    /** Reviewing only. Called when "Delete Network" is clicked, with the `network` prop. The delete section is hidden when omitted */
    onDelete?: (network: Network) => void
    /** Reviewing only. Called when Cancel is clicked. The button is hidden when omitted */
    onCancel?: () => void
}

export const NetworkForm = ({
    network: reviewedNetwork,
    onSave,
    onDelete,
    onCancel,
}: NetworkFormProps) => {
    const initialNetwork = reviewedNetwork ?? EMPTY_NETWORK
    const [network, setNetwork] = useState(initialNetwork)
    const [source, setSource] = useState(reviewedNetwork)
    // Changing it remounts the auth editors, which keep their own state
    const [resetKey, setResetKey] = useState(0)
    const [submitted, setSubmitted] = useState(false)

    // Start over when a different network is passed in
    if (reviewedNetwork !== source) {
        setSource(reviewedNetwork)
        setNetwork(initialNetwork)
        setResetKey((key) => key + 1)
        setSubmitted(false)
    }

    const errors: FieldErrors = submitted
        ? validate(network)
        : { synchronizerId: undefined, ledgerApi: undefined }
    const hasErrors = Object.values(errors).some(Boolean)

    const setField = (patch: Partial<Network>) =>
        setNetwork((current) => ({ ...current, ...patch }))

    // These stay the same between renders, so that the auth editors below only
    // re-render when their own auth changes, not on every keystroke elsewhere
    const setUserAuth = useCallback((auth: Auth | undefined) => {
        // The user auth can't be removed
        if (auth) setNetwork((current) => ({ ...current, auth }))
    }, [])
    // Sets an optional auth, or drops it when it was removed
    const setOptionalAuth = useCallback(
        (key: 'adminAuth' | 'serviceAccountAuth', auth: Auth | undefined) =>
            setNetwork((current) => {
                const next = { ...current }
                delete next[key]
                return auth ? { ...next, [key]: auth } : next
            }),
        []
    )
    const setAdminAuth = useCallback(
        (auth: Auth | undefined) => setOptionalAuth('adminAuth', auth),
        [setOptionalAuth]
    )
    const setServiceAccountAuth = useCallback(
        (auth: Auth | undefined) => setOptionalAuth('serviceAccountAuth', auth),
        [setOptionalAuth]
    )

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault()
        setSubmitted(true)

        if (Object.values(validate(network)).some(Boolean)) return
        onSave(network)
    }

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            <Stack spacing={2}>
                <TextField
                    label="Network Id"
                    required
                    fullWidth
                    helperText="A unique identifier for the network"
                    value={network.id}
                    onChange={(e) => setField({ id: e.target.value })}
                />
                <TextField
                    label="Name"
                    required
                    fullWidth
                    value={network.name}
                    onChange={(e) => setField({ name: e.target.value })}
                />
                <TextField
                    label="Description"
                    required
                    fullWidth
                    value={network.description}
                    onChange={(e) => setField({ description: e.target.value })}
                />
                <TextField
                    label="Synchronizer Id"
                    fullWidth
                    error={!!errors.synchronizerId}
                    helperText={errors.synchronizerId}
                    value={network.synchronizerId ?? ''}
                    onChange={(e) => {
                        // Left out of the network when empty
                        const next = { ...network }
                        if (e.target.value) {
                            next.synchronizerId = e.target.value
                        } else {
                            delete next.synchronizerId
                        }
                        setNetwork(next)
                    }}
                />
                <TextField
                    label="Identity Provider Id"
                    required
                    fullWidth
                    value={network.identityProviderId}
                    onChange={(e) =>
                        setField({ identityProviderId: e.target.value })
                    }
                />
                <TextField
                    label="Ledger API Base Url"
                    required
                    fullWidth
                    error={!!errors.ledgerApi}
                    helperText={errors.ledgerApi}
                    value={network.ledgerApi}
                    onChange={(e) => setField({ ledgerApi: e.target.value })}
                />

                <Section title="Configure user auth">
                    <MemoizedAuthEditor
                        key={resetKey}
                        auth={network.auth}
                        onChange={setUserAuth}
                    />
                </Section>

                <Section title="Configure admin auth">
                    <MemoizedAuthEditor
                        key={resetKey}
                        auth={network.adminAuth}
                        optional
                        label="admin auth"
                        onChange={setAdminAuth}
                    />
                </Section>

                <Section title="Configure service account auth">
                    <MemoizedAuthEditor
                        key={resetKey}
                        auth={network.serviceAccountAuth}
                        allowedMethods={SERVICE_ACCOUNT_METHODS}
                        optional
                        label="service account auth"
                        onChange={setServiceAccountAuth}
                    />
                </Section>
            </Stack>

            {hasErrors && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    Invalid network data, please ensure all fields are set
                    correctly
                </Alert>
            )}

            {reviewedNetwork ? (
                <>
                    {onDelete && (
                        <Box sx={{ mt: 4 }}>
                            <Divider sx={{ mb: 3 }} />
                            <Typography
                                variant="subtitle1"
                                component="h2"
                                sx={{ fontWeight: 'bold', mb: 1 }}
                            >
                                Delete network
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 2 }}
                            >
                                You will not be able to undo the change once you
                                delete this network.
                            </Typography>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => onDelete(reviewedNetwork)}
                            >
                                Delete Network
                            </Button>
                        </Box>
                    )}
                    <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                        {onCancel && (
                            <Button
                                variant="outlined"
                                color="inherit"
                                fullWidth
                                onClick={onCancel}
                            >
                                Cancel
                            </Button>
                        )}
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            data-test-id="update-network-button"
                        >
                            Update
                        </Button>
                    </Stack>
                </>
            ) : (
                <Box sx={{ mt: 'auto', pt: 3 }}>
                    <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        data-test-id="add-network-button"
                    >
                        Add
                    </Button>
                </Box>
            )}
        </Box>
    )
}
