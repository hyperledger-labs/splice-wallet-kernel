// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi, describe, it, expect } from 'vitest'
import { Ops } from './index.js'

const MOCK_LEDGER_VERSION = 'example-ledger-version'

vi.mock('@canton-network/core-ledger-client', () => ({
    LedgerClient: vi.fn(function LedgerClientMock() {
        return {
            parseSupportedVersions: vi.fn(() => MOCK_LEDGER_VERSION),
            getWithRetry: vi.fn(async (resource: string) => {
                if (resource === '/v2/version') {
                    return { version: MOCK_LEDGER_VERSION }
                }
                throw new Error(
                    `Unexpected resource in mock LedgerClient: ${resource}`
                )
            }),
            postWithRetry: vi.fn(),
        }
    }),
    defaultRetryableOptions: {},
}))

describe('LedgerProvider', () => {
    it('should call ledger client', async () => {
        const LPM = await import('./LedgerProvider.js')
        const provider = new LPM.LedgerProvider({
            baseUrl: 'https://example.com',
            accessToken: 'dummy-token',
        })

        const result = await provider.request<Ops.GetV2Version>({
            method: 'ledgerApi',
            params: {
                requestMethod: 'get',
                resource: '/v2/version',
            },
        })

        expect(result.version).toBe(MOCK_LEDGER_VERSION)
    })
})
