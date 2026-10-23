// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createFileRoute } from '@tanstack/react-router'
import { PartiesPage } from '@/ui/features/parties'

export const Route = createFileRoute('/_unlocked/parties/')({
    validateSearch: (
        search: Record<string, unknown>
    ): { createPartyStatus?: string } =>
        typeof search.createPartyStatus === 'string'
            ? { createPartyStatus: search.createPartyStatus }
            : {},
    component: PartiesRoute,
})

function PartiesRoute() {
    const { createPartyStatus } = Route.useSearch()
    return <PartiesPage createPartyStatus={createPartyStatus} />
}
