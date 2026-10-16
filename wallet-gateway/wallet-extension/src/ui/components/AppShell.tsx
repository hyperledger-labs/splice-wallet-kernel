// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import AppBar from '@mui/material/AppBar'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'
import { ColorModeToggle } from './ColorModeToggle'

// Placeholder layout. Navigation and the account menu come with the ported pages.
export function AppShell({ children }: { children: ReactNode }) {
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
                    <ColorModeToggle />
                </Toolbar>
            </AppBar>
            <Container component="main" maxWidth="md" sx={{ py: 2 }}>
                {children}
            </Container>
        </>
    )
}
