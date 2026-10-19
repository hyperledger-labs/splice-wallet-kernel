// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'
import { sql } from 'kysely'

import {
    forEachDialect,
    indexExists,
    listColumns,
    migrateDownThrough,
    migrateUpThrough,
    migrateUpToBefore,
} from '../helpers'
import { insertSession } from '../seeds/019-make-session-access-token-nullable'

const TARGET = 19

forEachDialect('migration 019 - nullable session access token', ({ getDb }) => {
    test('allows tokenless onboarding sessions and preserves existing sessions', async () => {
        const db = getDb()
        await migrateUpToBefore(db, TARGET)

        await insertSession(db, {
            id: 'existing-session',
            network: 'network-1',
            accessToken: 'existing-token',
            userId: 'alice',
            origin: 'https://example.com',
        })

        await migrateUpThrough(db, TARGET)

        const accessTokenColumn = (await listColumns(db, 'sessions')).find(
            (column) => column.name === 'access_token'
        )
        expect(accessTokenColumn?.nullable).toBe(true)

        // Same user, network and origin as the logged-in session.
        await insertSession(db, {
            id: 'onboarding-session',
            network: 'network-1',
            userId: 'alice',
            origin: 'https://example.com',
        })
        await insertSession(db, {
            id: 'onboarding-other-origin',
            network: 'network-1',
            userId: 'alice',
            origin: 'https://other.example',
        })
        await insertSession(db, {
            id: 'onboarding-duplicate-origin',
            network: 'network-1',
            userId: 'alice',
            origin: 'https://example.com',
        })

        const sessions = await sql<{
            id: string
            accessToken: string | null
        }>`
                SELECT id, access_token
                FROM sessions
                ORDER BY id
            `.execute(db)
        expect(sessions.rows).toEqual([
            {
                id: 'existing-session',
                accessToken: 'existing-token',
            },
            { id: 'onboarding-duplicate-origin', accessToken: null },
            { id: 'onboarding-other-origin', accessToken: null },
            { id: 'onboarding-session', accessToken: null },
        ])
        expect(
            await indexExists(
                db,
                'sessions',
                'sessions_one_session_per_origin_user'
            )
        ).toBe(true)
        expect(
            await indexExists(
                db,
                'sessions',
                'sessions_unique_access_token_per_network'
            )
        ).toBe(true)
        expect(
            await indexExists(
                db,
                'sessions',
                'sessions_one_onboarding_session_per_origin_user'
            )
        ).toBe(false)
    })

    test('removes tokenless sessions and restores the non-null constraint on down', async () => {
        const db = getDb()
        await migrateUpThrough(db, TARGET)

        await insertSession(db, {
            id: 'onboarding-session',
            network: 'network-1',
            userId: 'alice',
            origin: 'https://example.com',
        })
        await insertSession(db, {
            id: 'authenticated-session',
            network: 'network-1',
            accessToken: 'token',
            userId: 'bob',
            origin: 'https://example.com',
        })

        await migrateDownThrough(db, TARGET)

        const accessTokenColumn = (await listColumns(db, 'sessions')).find(
            (column) => column.name === 'access_token'
        )
        expect(accessTokenColumn?.nullable).toBe(false)

        const sessions = await sql<{
            id: string
        }>`SELECT id FROM sessions`.execute(db)
        expect(sessions.rows).toEqual([{ id: 'authenticated-session' }])
        expect(
            await indexExists(
                db,
                'sessions',
                'sessions_one_onboarding_session_per_origin_user'
            )
        ).toBe(false)
    })
})
