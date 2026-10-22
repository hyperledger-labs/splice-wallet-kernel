// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import GlobalStyles from '@mui/material/GlobalStyles'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { watchVaultStatus } from '@/ui/features/vault'
import '@/ui/theme/fonts'
import { AppProviders } from './AppProviders'
import { createQueryClient } from './query-client'
import { createAppRouter } from './router'
import type { UiEntry } from './router-context'

const popupSize = { body: { width: 360, minHeight: 600 } }

/** Renders the shared route tree into an extension page. */
export function mountApp(container: HTMLElement, entry: UiEntry) {
    const queryClient = createQueryClient()
    const router = createAppRouter({ queryClient, entry })
    // Lives as long as the page, so it never unwatches.
    watchVaultStatus(router, queryClient)
    createRoot(container).render(
        <StrictMode>
            <AppProviders queryClient={queryClient}>
                {entry === 'popup' && <GlobalStyles styles={popupSize} />}
                <RouterProvider router={router} />
            </AppProviders>
        </StrictMode>
    )
}
