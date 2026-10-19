// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Kysely, sql } from 'kysely'
import type { DB } from '../../../schema.js'

export async function insertIdp(
    db: Kysely<DB>,
    row: {
        id: string
        type: 'oauth' | 'self_signed' | 'self_issued'
        issuer: string | null
        configUrl?: string | null
    }
): Promise<void> {
    await sql`
        INSERT INTO idps (id, type, issuer, config_url)
        VALUES (${row.id}, ${row.type}, ${row.issuer}, ${row.configUrl ?? null})
    `.execute(db)
}
