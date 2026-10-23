// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { ToastProvider } from '@canton-network/core-wallet-ui-components/react'
import CssBaseline from '@mui/material/CssBaseline'
import GlobalStyles from '@mui/material/GlobalStyles'
import { ThemeProvider } from '@mui/material/styles'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { litBridgeStyles } from '@/ui/theme/lit-bridge'
import { theme } from '@/ui/theme/theme'

export function AppProviders({
    queryClient,
    children,
}: {
    queryClient: QueryClient
    children: ReactNode
}) {
    return (
        <ThemeProvider
            theme={theme}
            defaultMode="dark"
            modeStorageKey="wallet-extension-color-mode"
            colorSchemeStorageKey="wallet-extension-color-scheme"
            noSsr
            disableTransitionOnChange
        >
            <CssBaseline enableColorScheme />
            <GlobalStyles styles={litBridgeStyles} />
            <QueryClientProvider client={queryClient}>
                <ToastProvider>{children}</ToastProvider>
            </QueryClientProvider>
        </ThemeProvider>
    )
}
