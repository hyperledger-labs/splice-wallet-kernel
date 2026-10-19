// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createRootRouteWithContext, Outlet } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import type { RouterContext } from '@/ui/app/router-context'

// `wxt build` replaces import.meta.env.DEV with false, so the devtools chunk
// is never emitted in production builds.
const Devtools = import.meta.env.DEV
    ? lazy(() => import('@/ui/app/devtools'))
    : null

export const Route = createRootRouteWithContext<RouterContext>()({
    component: RootLayout,
})

function RootLayout() {
    return (
        <>
            <Outlet />
            {Devtools && (
                <Suspense>
                    <Devtools />
                </Suspense>
            )}
        </>
    )
}
