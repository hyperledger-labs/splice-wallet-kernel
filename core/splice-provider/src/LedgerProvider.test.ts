// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { jest, describe, it, expect } from '@jest/globals'
import { GetV2Version } from '@canton-network/core-ledger-client-types'

const MOCK_LEDGER_VERSION = 'example-ledger-version'

jest.mock('@canton-network/core-ledger-client', () => ({
    LedgerClient: jest.fn().mockImplementation(() => ({
        parseSupportedVersions: jest.fn(() => MOCK_LEDGER_VERSION),
        getWithRetry: jest.fn(async (resource: string) => {
            if (resource === '/v2/version') {
                return { version: MOCK_LEDGER_VERSION }
            }
            throw new Error(
                `Unexpected resource in mock LedgerClient: ${resource}`
            )
        }),
        postWithRetry: jest.fn(),
    })),
    defaultRetryableOptions: {},
}))

describe('LedgerProvider', async () => {
    it('should call ledger client', async () => {
        const LPM = await import('./LedgerProvider')
        const provider = new LPM.LedgerProvider({
            baseUrl: 'https://example.com',
            accessToken: 'dummy-token',
        })

        const result = await provider.request<GetV2Version>({
            method: 'ledgerApi',
            params: {
                requestMethod: 'get',
                resource: '/v2/version',
            },
        })

        expect(result.version).toBe(MOCK_LEDGER_VERSION)
    })
})
