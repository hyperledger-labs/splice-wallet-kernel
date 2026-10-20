// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useNavigate } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { VaultErrorName } from '@/shared/vault-protocol'
import { useUnlockVault } from './api'

export function UnlockPage() {
    const navigate = useNavigate()
    const unlock = useUnlockVault()
    const [password, setPassword] = useState('')

    const wrongPassword = unlock.error?.name === VaultErrorName.InvalidPassword

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (password === '' || unlock.isPending) return
        setPassword('')
        unlock.mutate(password, {
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
                Unlock
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Enter your password to unlock the wallet.
            </Typography>
            <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                autoFocus
                fullWidth
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={wrongPassword}
                helperText={wrongPassword && 'Wrong password. Try again.'}
            />
            {unlock.isError && !wrongPassword && (
                <Alert severity="error">
                    Couldn't unlock the wallet. Try again.
                </Alert>
            )}
            <Button
                type="submit"
                variant="contained"
                disabled={password === ''}
                loading={unlock.isPending}
            >
                Unlock
            </Button>
        </Stack>
    )
}
