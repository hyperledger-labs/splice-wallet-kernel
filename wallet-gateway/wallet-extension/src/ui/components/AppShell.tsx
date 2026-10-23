// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import LockOutlined from '@mui/icons-material/LockOutlined'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { useRouter } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useLockVault } from '@/ui/features/vault'

// Placeholder layout. Navigation and the account menu come with the ported pages.
export function AppShell({ children }: { children: ReactNode }) {
    const router = useRouter()
    const lock = useLockVault()

    return (
        <>
            <AppBar position="sticky" color="default" elevation={0}>
                <Toolbar variant="dense" sx={{ gap: 1 }}>
                    <Typography
                        variant="h6"
                        component="span"
                        sx={{ flexGrow: 1, fontWeight: 600 }}
                    >
                        Wallet
                    </Typography>
                    <Button
                        size="small"
                        color="inherit"
                        startIcon={<LockOutlined />}
                        loading={lock.isPending}
                        // The guards then send this page to /unlock.
                        onClick={() =>
                            lock.mutate(undefined, {
                                onSuccess: () => void router.invalidate(),
                            })
                        }
                    >
                        Lock
                    </Button>
                </Toolbar>
            </AppBar>
            <Container component="main" maxWidth="md" sx={{ py: 2 }}>
                {lock.isError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        Couldn't lock the wallet. Try again.
                    </Alert>
                )}
                {children}
            </Container>
        </>
    )
}
