// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Kysely, sql } from 'kysely'
import type { DB } from '../../../schema.js'

export async function insertSession(
    db: Kysely<DB>,
    row: {
        id: string
        network: string
        accessToken?: string
        userId: string
        origin: string
    }
): Promise<void> {
    await sql`
        INSERT INTO sessions (id, network, access_token, user_id, origin)
        VALUES (
            ${row.id},
            ${row.network},
            ${row.accessToken ?? null},
            ${row.userId},
            ${row.origin}
        )
    `.execute(db)
}
