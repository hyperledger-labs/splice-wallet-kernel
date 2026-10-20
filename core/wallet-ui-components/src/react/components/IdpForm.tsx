// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, type SubmitEvent } from 'react'
import type { Idp } from '@canton-network/core-wallet-user-rpc-client'
import {
    Alert,
    Box,
    Button,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material'

const EMPTY_IDP: Idp = { id: '', type: 'oauth', issuer: '', configUrl: '' }

interface IdpFormProps {
    /**
     * The identity provider to review and edit. Leave it out to add a new one.
     * The form starts over whenever a different object is passed
     */
    idp?: Idp | undefined
    /** Disables the fields and the submit button, e.g. while saving */
    loading?: boolean
    /** Called with the entered identity provider when the form is submitted */
    onSave: (idp: Idp) => void
    /** Reviewing only. Called when "Delete identity provider" is clicked, with the `idp` prop. The delete section is hidden when omitted */
    onDelete?: (idp: Idp) => void
    /** Reviewing only. Called when Cancel is clicked. The button is hidden when omitted */
    onCancel?: () => void
}

const issuerOf = (idp: Idp) => ('issuer' in idp ? idp.issuer : '')
const configUrlOf = (idp: Idp) => ('configUrl' in idp ? idp.configUrl : '')

export const IdpForm = ({
    idp,
    loading = false,
    onSave,
    onDelete,
    onCancel,
}: IdpFormProps) => {
    const initial = idp ?? EMPTY_IDP
    const [id, setId] = useState(initial.id)
    const [type, setType] = useState<Idp['type']>(initial.type)
    // The drafts of fields that the selected type hides are kept, so switching
    // the type back and forth doesn't lose what was typed
    const [issuer, setIssuer] = useState(issuerOf(initial))
    const [configUrl, setConfigUrl] = useState(configUrlOf(initial))
    const [error, setError] = useState('')
    const [currentIdp, setCurrentIdp] = useState(idp)

    // Start over when a different identity provider is passed in
    if (idp !== currentIdp) {
        setCurrentIdp(idp)
        setId(initial.id)
        setType(initial.type)
        setIssuer(issuerOf(initial))
        setConfigUrl(configUrlOf(initial))
        setError('')
    }

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault()

        if (
            !id ||
            (type !== 'self_issued' && !issuer) ||
            (type === 'oauth' && !configUrl)
        ) {
            setError('Please fill in all required fields')
            return
        }

        setError('')
        switch (type) {
            case 'oauth':
                onSave({ id, type, issuer, configUrl })
                break
            case 'self_signed':
                onSave({ id, type, issuer })
                break
            case 'self_issued':
                onSave({ id, type })
                break
        }
    }

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            <Stack spacing={2}>
                <TextField
                    id="idp-id"
                    label="ID"
                    required
                    fullWidth
                    placeholder="Enter the identity provider ID"
                    helperText="A unique identifier for the identity provider"
                    disabled={loading}
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                />
                <TextField
                    id="idp-type"
                    select
                    label="Type"
                    required
                    fullWidth
                    disabled={loading}
                    value={type}
                    onChange={(e) => setType(e.target.value as Idp['type'])}
                    // A native select: it is what screen readers and e2e tests expect
                    slotProps={{ select: { native: true } }}
                >
                    <option value="oauth">oauth</option>
                    <option value="self_signed">self_signed</option>
                    <option value="self_issued">self_issued</option>
                </TextField>
                {type !== 'self_issued' && (
                    <TextField
                        id="idp-issuer"
                        label="Issuer URL"
                        required
                        fullWidth
                        placeholder="Enter the issuer URL"
                        disabled={loading}
                        value={issuer}
                        onChange={(e) => setIssuer(e.target.value)}
                    />
                )}
                {type === 'oauth' && (
                    <TextField
                        id="idp-config-url"
                        label="Config URL"
                        required
                        fullWidth
                        placeholder="Enter the configuration URL"
                        disabled={loading}
                        value={configUrl}
                        onChange={(e) => setConfigUrl(e.target.value)}
                    />
                )}
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}

            {idp ? (
                <>
                    {onDelete && (
                        <Box sx={{ mt: 4 }}>
                            <Divider sx={{ mb: 3 }} />
                            <Typography
                                variant="subtitle1"
                                component="h2"
                                sx={{ fontWeight: 'bold', mb: 1 }}
                            >
                                Delete identity provider
                            </Typography>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 2 }}
                            >
                                You will not be able to undo the change once you
                                delete this Identity Provider.
                            </Typography>
                            <Button
                                variant="outlined"
                                color="error"
                                onClick={() => onDelete(idp)}
                            >
                                Delete identity provider
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
                            disabled={loading}
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
                        disabled={loading}
                    >
                        Add
                    </Button>
                </Box>
            )}
        </Box>
    )
}
