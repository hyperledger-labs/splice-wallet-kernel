// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { localNetStaticConfig } from '@canton-network/wallet-sdk'
import { beforeEach } from 'node:test'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
    const create = vi.fn()

    return {
        create,
    }
})

vi.mock('@canton-network/wallet-sdk', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@canton-network/wallet-sdk')>()
    return {
        ...actual,
        SDK: {
            create: mocks.create,
        },
    }
})

describe('defaultSdk', () => {
    beforeEach(() => {})

    it('should create a default instance of wallet-sdk', async () => {
        await import('./defaultSdk')

        expect(mocks.create).toHaveBeenCalledExactlyOnceWith({
            auth: {
                method: 'self_signed',
                issuer: 'unsafe-auth',
                credentials: {
                    clientId: localNetStaticConfig.LOCALNET_USER_ID,
                    clientSecret: 'unsafe',
                    audience: 'https://canton.network.global',
                    scope: '',
                },
            },
            ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        })
    })
})
