// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

export type FeaturedAppRight = {
    template_id: string
    contract_id: string
    payload: Record<string, never>
    created_event_blob: string
    created_at: string
}

export type LookupFeaturedAppRightsOptions = {
    partyId: string
    maxRetries?: number
    delayMs?: number
}

export type GrantFeaturedAppRightsOptions = {
    synchronizerId?: string
    maxRetries?: number
    delayMs?: number
}
