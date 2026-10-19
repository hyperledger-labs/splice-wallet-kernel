// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState, type ReactNode } from 'react'
import type {
    Auth,
    AuthorizationCodeAuth,
    ClientCredentialsAuth,
    SelfIssuedAuth,
    SelfSignedAuth,
} from '@canton-network/core-wallet-user-rpc-client'
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'

export type AuthMethod =
    | 'authorization_code'
    | 'client_credentials'
    | 'self_signed'
    | 'self_issued'

const ALL_METHODS: AuthMethod[] = [
    'authorization_code',
    'client_credentials',
    'self_signed',
    'self_issued',
]

type EditorMode = 'none' | 'view' | 'edit' | 'add' | 'pending-remove'

const hasConfiguredAuth = (auth: Auth | undefined): auth is Auth =>
    typeof auth?.method === 'string'

const defaultAuth = (method: AuthMethod): Auth => {
    switch (method) {
        case 'authorization_code':
            return {
                method,
                clientId: '',
                audience: '',
                scope: '',
            } satisfies AuthorizationCodeAuth
        case 'client_credentials':
            return {
                method,
                clientId: '',
                audience: '',
                scope: '',
                clientSecret: '',
            } satisfies ClientCredentialsAuth
        case 'self_issued':
            return {
                method,
                audience: '',
                scope: '',
            } satisfies SelfIssuedAuth
        case 'self_signed':
            return {
                method,
                clientId: '',
                audience: '',
                scope: '',
                issuer: '',
                clientSecret: '',
            } satisfies SelfSignedAuth
    }
}

const maskSecret = (secret?: string) => (secret ? '********' : '(not set)')

const getSummary = (auth: Auth): Array<{ key: string; value: string }> => {
    const rows = [
        { key: 'Method', value: auth.method },
        { key: 'Audience', value: auth.audience ?? '' },
        { key: 'Scope', value: auth.scope ?? '' },
    ]

    if ('clientId' in auth) {
        rows.splice(1, 0, { key: 'Client Id', value: auth.clientId ?? '' })
    }
    if ('issuer' in auth) {
        rows.push({ key: 'Issuer', value: auth.issuer ?? '' })
    }
    if ('clientSecret' in auth) {
        rows.push({
            key: 'Client Secret',
            value: maskSecret(auth.clientSecret),
        })
    }
    if (auth.method === 'client_credentials' && auth.identityProviderId) {
        rows.push({
            key: 'Identity Provider Id',
            value: auth.identityProviderId,
        })
    }
    return rows
}

// Fields carried over when the method changes, as far as the new method has them
const switchMethod = (current: Auth, method: AuthMethod): Auth => {
    const clientId = 'clientId' in current ? current.clientId : ''
    const audience = current.audience ?? ''
    const scope = current.scope ?? ''

    switch (method) {
        case 'authorization_code':
            return {
                method,
                clientId,
                audience,
                scope,
            } satisfies AuthorizationCodeAuth
        case 'self_signed':
            return {
                method,
                clientId,
                audience,
                scope,
                issuer: (current as SelfSignedAuth).issuer ?? '',
                clientSecret: (current as SelfSignedAuth).clientSecret ?? '',
            } satisfies SelfSignedAuth
        case 'self_issued':
            return { method, audience, scope } satisfies SelfIssuedAuth
        case 'client_credentials':
            return {
                method,
                ...(current.method === 'client_credentials' &&
                current.identityProviderId
                    ? { identityProviderId: current.identityProviderId }
                    : {}),
                clientId,
                audience,
                scope,
                clientSecret:
                    (current as ClientCredentialsAuth).clientSecret ?? '',
            } satisfies ClientCredentialsAuth
        default:
            throw new Error(`Unsupported auth method: ${String(method)}`)
    }
}

interface AuthFieldProps {
    label: string
    /** Used by the e2e helpers to find the input */
    testId: string
    value: string
    onChange: (value: string) => void
    required?: boolean
    placeholder?: string
    helperText?: ReactNode
}

const AuthField = ({
    label,
    testId,
    value,
    onChange,
    required = false,
    placeholder,
    helperText,
}: AuthFieldProps) => (
    <TextField
        label={label}
        required={required}
        fullWidth
        value={value}
        placeholder={placeholder}
        helperText={helperText}
        onChange={(e) => onChange(e.target.value)}
        slotProps={{ htmlInput: { 'data-test-id': testId } }}
    />
)

interface AuthEditorProps {
    /** The current auth. The editor is controlled: pass back what `onChange` reports */
    auth?: Auth | undefined
    /** Called with the edited auth as the user types, or `undefined` when it is removed or cancelled */
    onChange: (auth: Auth | undefined) => void
    /** Methods offered in the select, the first one is the default @default all four */
    allowedMethods?: AuthMethod[]
    /** Lets the auth be absent: shows an Add button, and Edit/Remove once configured @default false */
    optional?: boolean
    /**
     * What this auth is for, used in the messages of an optional auth: "No
     * admin auth configured." and "Admin auth will be removed after submitting
     * this form." @default 'auth'
     */
    label?: string
}

export const AuthEditor = ({
    auth,
    onChange,
    allowedMethods = ALL_METHODS,
    optional = false,
    label = 'auth',
}: AuthEditorProps) => {
    const emptyText = `No ${label} configured.`
    const pendingRemoveText = `${label.charAt(0).toUpperCase()}${label.slice(1)} will be removed after submitting this form.`
    const [mode, setMode] = useState<EditorMode>(() =>
        !optional ? 'edit' : hasConfiguredAuth(auth) ? 'view' : 'none'
    )
    // The auth as it was before editing or removing, to restore on cancel
    const [backup, setBackup] = useState<Auth | undefined>()
    // What the user typed into the secret field. The current secret is never shown
    const [secretReplacement, setSecretReplacement] = useState('')

    const startAdd = () => {
        setSecretReplacement('')
        setMode('add')
    }

    const startEdit = () => {
        if (auth) setBackup(structuredClone(auth))
        setSecretReplacement('')
        setMode('edit')
    }

    const markForRemove = () => {
        if (auth) setBackup(structuredClone(auth))
        onChange(undefined)
        setMode('pending-remove')
    }

    const cancelRemove = () => {
        if (backup) {
            onChange(structuredClone(backup))
            setMode('view')
        } else {
            setMode(optional ? 'none' : 'edit')
        }
    }

    const cancelEdit = () => {
        if (backup) {
            onChange(structuredClone(backup))
            setMode('view')
        } else {
            onChange(undefined)
            setMode(optional ? 'none' : 'edit')
        }
        setSecretReplacement('')
    }

    const emptyState = (
        <Stack spacing={1} data-test-id="auth-editor-empty-state">
            <Typography
                variant="body2"
                color="text.secondary"
                data-test-id="auth-editor-empty-text"
            >
                {emptyText}
            </Typography>
            <Box>
                <Button
                    size="small"
                    data-test-id="auth-editor-add-button"
                    onClick={startAdd}
                >
                    Add
                </Button>
            </Box>
        </Stack>
    )

    if (mode === 'none') return emptyState

    if (mode === 'pending-remove') {
        return (
            <Stack spacing={1} data-test-id="auth-editor-pending-remove-state">
                <Alert
                    severity="warning"
                    data-test-id="auth-editor-pending-remove-text"
                >
                    {pendingRemoveText}
                </Alert>
                <Box>
                    <Button
                        size="small"
                        data-test-id="auth-editor-cancel-remove-button"
                        onClick={cancelRemove}
                    >
                        Cancel
                    </Button>
                </Box>
            </Stack>
        )
    }

    if (mode === 'view' && hasConfiguredAuth(auth)) {
        return (
            <Stack spacing={1} data-test-id="auth-editor-view-state">
                <Box
                    component="dl"
                    data-test-id="auth-editor-summary-list"
                    sx={{ m: 0 }}
                >
                    {getSummary(auth).map((row) => (
                        <Box
                            key={row.key}
                            data-test-id="auth-editor-summary-row"
                            sx={{
                                display: 'flex',
                                gap: 2,
                                minHeight: 32,
                                alignItems: 'center',
                            }}
                        >
                            <Typography
                                component="dt"
                                variant="body2"
                                noWrap
                                sx={{
                                    fontWeight: 'bold',
                                    flexShrink: 0,
                                    minWidth: '8rem',
                                }}
                            >
                                {row.key}
                            </Typography>
                            <Typography
                                component="dd"
                                variant="body2"
                                noWrap
                                title={row.value}
                                sx={{
                                    m: 0,
                                    flex: 1,
                                    minWidth: 0,
                                    textAlign: 'right',
                                }}
                            >
                                {row.value}
                            </Typography>
                        </Box>
                    ))}
                </Box>
                <Stack direction="row" spacing={1}>
                    <Button
                        size="small"
                        data-test-id="auth-editor-edit-button"
                        onClick={startEdit}
                    >
                        Edit
                    </Button>
                    <Button
                        size="small"
                        color="error"
                        data-test-id="auth-editor-remove-button"
                        onClick={markForRemove}
                    >
                        Remove
                    </Button>
                </Stack>
            </Stack>
        )
    }

    // Edit and add. Without an auth yet, the form starts from the first method's defaults
    const working: Auth = hasConfiguredAuth(auth)
        ? auth
        : defaultAuth(allowedMethods[0] ?? 'authorization_code')
    const method: string = working.method
    const update = (patch: Record<string, unknown>) =>
        onChange({ ...working, ...patch } as Auth)

    const backupSecret =
        backup && 'clientSecret' in backup ? backup.clientSecret : undefined
    const workingSecret =
        'clientSecret' in working ? working.clientSecret : undefined

    // A secret that is set but never shown: leaving the field empty keeps it
    const hasExistingSecret =
        secretReplacement.trim() === '' &&
        mode !== 'add' &&
        ((typeof workingSecret === 'string' && workingSecret !== '') ||
            (typeof backupSecret === 'string' && backupSecret.length > 0))

    const changeSecret = (replacement: string) => {
        setSecretReplacement(replacement)

        let clientSecret: string
        if (replacement.trim() !== '') clientSecret = replacement
        else if (mode === 'add') clientSecret = ''
        else if (typeof backupSecret === 'string') clientSecret = backupSecret
        else clientSecret = workingSecret ?? ''

        update({ clientSecret })
    }

    const changeIdentityProviderId = (value: string) => {
        const trimmed = value.trim()
        const { identityProviderId: _identityProviderId, ...rest } =
            working as ClientCredentialsAuth
        onChange(trimmed ? { ...rest, identityProviderId: trimmed } : rest)
    }

    const clientIdField = 'clientId' in working && (
        <AuthField
            label="Client Id"
            testId="auth-editor-client-id-input"
            required
            value={working.clientId ?? ''}
            onChange={(clientId) => update({ clientId })}
        />
    )

    const clientSecretField = (
        <AuthField
            label="Client Secret"
            testId="auth-editor-client-secret-input"
            required={!hasExistingSecret}
            value={secretReplacement}
            placeholder={hasExistingSecret ? '********' : ''}
            helperText={
                hasExistingSecret ? (
                    <span data-test-id="auth-editor-secret-help">
                        Current secret is hidden. Enter a new value to replace
                        it.
                    </span>
                ) : undefined
            }
            onChange={changeSecret}
        />
    )

    return (
        <>
            <Stack spacing={2} data-test-id="auth-editor-edit-state">
                <TextField
                    select
                    label="Method"
                    required
                    fullWidth
                    value={method}
                    onChange={(e) =>
                        onChange(
                            switchMethod(working, e.target.value as AuthMethod)
                        )
                    }
                    // A native select: it is what screen readers and e2e tests expect
                    slotProps={{
                        select: { native: true },
                        htmlInput: {
                            'data-test-id': 'auth-editor-method-select',
                        },
                    }}
                >
                    {/* A method that is not offered stays visible, instead of silently showing another */}
                    {!(allowedMethods as string[]).includes(method) && (
                        <option value={method} disabled>
                            {method}
                        </option>
                    )}
                    {allowedMethods.map((allowed) => (
                        <option key={allowed} value={allowed}>
                            {allowed}
                        </option>
                    ))}
                </TextField>

                <AuthField
                    label="Audience"
                    testId="auth-editor-audience-input"
                    required
                    value={working.audience ?? ''}
                    onChange={(audience) => update({ audience })}
                />
                <AuthField
                    label="Scope"
                    testId="auth-editor-scope-input"
                    required
                    value={working.scope ?? ''}
                    onChange={(scope) => update({ scope })}
                />

                {method === 'authorization_code' && clientIdField}

                {method === 'client_credentials' && (
                    <>
                        {clientIdField}
                        <AuthField
                            label="Identity Provider Id Override"
                            testId="auth-editor-identity-provider-id-input"
                            value={
                                (working as ClientCredentialsAuth)
                                    .identityProviderId ?? ''
                            }
                            helperText="Optional. Uses the network identity provider when empty."
                            onChange={changeIdentityProviderId}
                        />
                        {clientSecretField}
                    </>
                )}

                {method === 'self_signed' && (
                    <>
                        {clientIdField}
                        <AuthField
                            label="Issuer"
                            testId="auth-editor-issuer-input"
                            required
                            value={(working as SelfSignedAuth).issuer ?? ''}
                            onChange={(issuer) => update({ issuer })}
                        />
                        {clientSecretField}
                    </>
                )}

                {![
                    'authorization_code',
                    'client_credentials',
                    'self_signed',
                    'self_issued',
                ].includes(method) && (
                    // Only when the parent passes a method this editor doesn't know
                    <Alert
                        severity="warning"
                        data-test-id="auth-editor-unsupported-method-warning"
                    >
                        Unsupported auth method "{method}". Select a supported
                        method to continue.
                    </Alert>
                )}
            </Stack>

            {optional && (
                <Box sx={{ mt: 1 }}>
                    <Button
                        size="small"
                        data-test-id="auth-editor-cancel-edit-button"
                        onClick={cancelEdit}
                    >
                        Cancel
                    </Button>
                </Box>
            )}
        </>
    )
}
