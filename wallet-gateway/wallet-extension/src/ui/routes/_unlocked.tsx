// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { AppShell } from '@/ui/components/AppShell'
import { vaultStatusQuery } from '@/ui/features/vault'

export const Route = createFileRoute('/_unlocked')({
    beforeLoad: async ({ context }) => {
        const status = await context.queryClient.fetchQuery(vaultStatusQuery())
        if (status === 'uninitialized') {
            throw redirect({ to: '/onboarding/password' })
        }
        if (status === 'locked') {
            throw redirect({ to: '/unlock' })
        }
    },
    component: UnlockedLayout,
})

function UnlockedLayout() {
    return (
        <AppShell>
            <Outlet />
        </AppShell>
    )
}
