// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Kysely, sql } from 'kysely'
import type { DB } from '../../schema'

export async function insertTransaction(
    db: Kysely<DB>,
    row: {
        id?: string
        commandId: string
        status?: string
        preparedTransaction?: string
        preparedTransactionHash?: string
        payload?: string | null
        userId: string
        createdAt?: string | null
        signedAt?: string | null
        origin?: string | null
        externalTxId?: string | null
        failureReason?: string | null
        networkId: string
    }
): Promise<void> {
    await sql`
        INSERT INTO transactions (
         id, command_id, status, prepared_transaction, prepared_transaction_hash,
            payload, user_id, created_at, signed_at, origin, external_tx_id, network_id
        )
        VALUES (
            ${row.id ?? crypto.randomUUID()},
            ${row.commandId},
            ${row.status ?? 'pending'},
            ${row.preparedTransaction ?? 'prep'},
            ${row.preparedTransactionHash ?? 'hash'},
            ${row.payload ?? null},
            ${row.userId},
            ${row.createdAt ?? null},
            ${row.signedAt ?? null},
            ${row.origin ?? null},
            ${row.externalTxId ?? null},
            ${row.networkId}
        )
    `.execute(db)
}
