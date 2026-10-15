// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Kysely, sql } from 'kysely'
import type { DB } from '../../../schema.js'

export async function insertNetwork(
    db: Kysely<DB>,
    row: {
        id: string
        name?: string
        idpId: string
        userId?: string | null
        ledgerApiBaseUrl?: string
        synchronizerId?: string | null
        description?: string | null
        auth?: string
        adminAuth?: string
        serviceAccountAuth?: string | null
    }
): Promise<void> {
    await sql`
        INSERT INTO networks (
            id, name, synchronizer_id, description, ledger_api_base_url,
            user_id, identity_provider_id, auth, admin_auth, service_account_auth
        )
        VALUES (
            ${row.id},
            ${row.name ?? row.id},
            ${row.synchronizerId ?? null},
            ${row.description ?? null},
            ${row.ledgerApiBaseUrl ?? 'http://ledger.local'},
            ${row.userId ?? null},
            ${row.idpId},
            ${row.auth ?? '{"method":"self_signed"}'},
            ${row.adminAuth ?? null},
            ${row.serviceAccountAuth ?? null}
        )
    `.execute(db)
}
