// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHashHistory, createRouter } from '@tanstack/react-router'
import { NotFound, PageLoader, RouteError } from '@/ui/components/feedback'
import { routeTree } from '@/ui/routeTree.gen'
import type { RouterContext } from './router-context'

export function createAppRouter(context: RouterContext) {
    return createRouter({
        routeTree,
        context,
        // Extension pages are static files (popup.html, app.html), so the
        // route lives in the hash. Reloads and deep links keep working.
        history: createHashHistory(),
        defaultPreload: 'intent',
        // TanStack Query owns caching, so the router always calls loaders.
        defaultPreloadStaleTime: 0,
        scrollRestoration: true,
        defaultPendingComponent: PageLoader,
        defaultErrorComponent: RouteError,
        defaultNotFoundComponent: NotFound,
    })
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof createAppRouter>
    }
}
