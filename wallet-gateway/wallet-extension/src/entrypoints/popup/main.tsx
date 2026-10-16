// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/ui/theme/fonts'
import { AppProviders } from '@/ui/app/AppProviders'
import { PopupPlaceholder } from './PopupPlaceholder'

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <AppProviders>
            <PopupPlaceholder />
        </AppProviders>
    </StrictMode>
)
