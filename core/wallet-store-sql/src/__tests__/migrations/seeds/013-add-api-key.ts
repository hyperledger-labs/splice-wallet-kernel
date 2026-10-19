// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Kysely, sql } from 'kysely'
import type { DB } from '../../../schema.js'

export async function insertApiKey(
    db: Kysely<DB>,
    row: {
        id: string
        digest: string
        name: string
        userId: string
        email: string | null
        networkId: string
        createdAt: string
        lastUsedAt: string | null
    }
): Promise<void> {
    await sql`
        INSERT INTO api_keys (
            id, digest, name, user_id, email, network_id, created_at, last_used_at
        )
        VALUES (
            ${row.id},
            ${row.digest},
            ${row.name},
            ${row.userId},
            ${row.email},
            ${row.networkId},
            ${row.createdAt},
            ${row.lastUsedAt}
        )
    `.execute(db)
}
