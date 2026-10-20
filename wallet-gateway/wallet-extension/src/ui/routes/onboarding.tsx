// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute, redirect } from '@tanstack/react-router'
import { vaultStatusQuery } from '@/ui/features/vault'

// Layout for the onboarding steps. The password is the only step so far, so
// onboarding ends once the vault exists. The BIP-39 work adds its steps here
// and switches this guard to its own "onboarded" check.
export const Route = createFileRoute('/onboarding')({
    beforeLoad: async ({ context }) => {
        const status = await context.queryClient.fetchQuery(vaultStatusQuery())
        if (status !== 'uninitialized') {
            throw redirect({ to: '/' })
        }
    },
})
