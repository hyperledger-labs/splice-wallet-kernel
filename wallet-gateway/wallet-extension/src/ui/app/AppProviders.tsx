// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import CssBaseline from '@mui/material/CssBaseline'
import { ThemeProvider } from '@mui/material/styles'
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
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
            <QueryClientProvider client={queryClient}>
                {children}
            </QueryClientProvider>
        </ThemeProvider>
    )
}
