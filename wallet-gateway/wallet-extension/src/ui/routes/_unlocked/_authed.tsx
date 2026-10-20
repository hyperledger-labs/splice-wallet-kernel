// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Outlet } from '@tanstack/react-router'
import { AppShell } from '@/ui/components/AppShell'

// Pathless layout for signed-in pages. The auth guard (beforeLoad) comes with
// the login flow.
export const Route = createFileRoute('/_unlocked/_authed')({
    component: AuthedLayout,
})

function AuthedLayout() {
    return (
        <AppShell>
            <Outlet />
        </AppShell>
    )
}
