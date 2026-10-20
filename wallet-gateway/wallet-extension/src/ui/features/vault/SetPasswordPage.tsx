// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useNavigate } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { passwordProblems } from '@/shared/password-policy'
import { VaultErrorName } from '@/shared/vault-protocol'
import { useCreateVault } from './api'

export function SetPasswordPage() {
    const navigate = useNavigate()
    const createVault = useCreateVault()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')

    // With an empty field, the problems read as the rules.
    const problems = passwordProblems(password)
    // Flag the confirmation once it can no longer match, not while it's
    // still being typed.
    const mismatch = !password.startsWith(confirm)
    const canSubmit =
        problems.length === 0 && confirm === password && !createVault.isPending

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!canSubmit) return
        setPassword('')
        setConfirm('')
        createVault.mutate(password, {
            onSuccess: () => void navigate({ to: '/' }),
        })
    }

    return (
        <Stack
            component="form"
            noValidate
            onSubmit={handleSubmit}
            spacing={2}
            sx={{ p: 3, width: '100%', maxWidth: 440, mx: 'auto' }}
        >
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                Set a password
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                This password unlocks the wallet on this device. It can't be
                recovered.
            </Typography>
            <TextField
                label="Password"
                type="password"
                autoComplete="new-password"
                autoFocus
                fullWidth
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={password !== '' && problems.length > 0}
                helperText={problems.join(' ')}
            />
            <TextField
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                fullWidth
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                error={mismatch}
                helperText={mismatch && "The passwords don't match."}
            />
            {createVault.isError && (
                <Alert severity="error">{createError(createVault.error)}</Alert>
            )}
            <Button
                type="submit"
                variant="contained"
                disabled={!canSubmit}
                loading={createVault.isPending}
            >
                Set password
            </Button>
        </Stack>
    )
}

function createError(error: Error): string {
    switch (error.name) {
        case VaultErrorName.WeakPassword:
            return error.message
        case VaultErrorName.Exists:
            return 'This wallet already has a password.'
        default:
            return "Couldn't set the password. Try again."
    }
}
