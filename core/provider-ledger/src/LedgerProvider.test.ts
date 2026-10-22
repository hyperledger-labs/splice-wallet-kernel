// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi, describe, it, expect } from 'vitest'
import type { Ops } from './index.js'
import type { AuthTokenProvider } from '@canton-network/core-wallet-auth'

const MOCK_LEDGER_VERSION = 'example-ledger-version'
const MOCK_IDP_CONFIG = {
    identityProviderId: 'example-idp',
    issuer: 'https://example-idp.com',
    jwksUrl: 'https://example-idp.com/jwks',
}

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
            postWithRetry: vi.fn(async (...args: unknown[]) => {
                const [resource] = args

                if (resource === '/v2/idps') {
                    return {
                        identityProviderConfig: MOCK_IDP_CONFIG,
                    }
                }

                if (resource === '/v2/dars/validate') {
                    const options = args[4] as {
                        bodySerializer?: (b: unknown) => unknown
                    }
                    if (options?.bodySerializer) {
                        expect(
                            options.bodySerializer('fake-dar-file-content')
                        ).toBe('fake-dar-file-content')
                    }
                    return {}
                }

                throw new Error(
                    `Unexpected resource in mock LedgerClient: ${String(resource)}`
                )
            }),
            patchWithRetry: vi.fn(async (resource: string) => {
                if (resource === '/v2/idps/{idp-id}') {
                    return {
                        identityProviderConfig: MOCK_IDP_CONFIG,
                    }
                }
                throw new Error(
                    `Unexpected resource in mock LedgerClient: ${resource}`
                )
            }),
        }
    }),
    defaultRetryableOptions: {},
}))

const tokenProvider = {
    getAccessToken: async () => 'dummy-token',
} as unknown as AuthTokenProvider

describe('LedgerProvider', () => {
    it('should call ledger client with a GET request', async () => {
        const LPM = await import('./LedgerProvider.js')
        const provider = new LPM.LedgerProvider({
            baseUrl: 'https://example.com',
            accessTokenProvider: tokenProvider,
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

    it('should call ledger client with a POST request', async () => {
        const LPM = await import('./LedgerProvider.js')
        const provider = new LPM.LedgerProvider({
            baseUrl: 'https://example.com',
            accessTokenProvider: tokenProvider,
        })

        const result = await provider.request<Ops.PostV2Idps>({
            method: 'ledgerApi',
            params: {
                requestMethod: 'post',
                resource: '/v2/idps',
                body: {
                    identityProviderConfig: MOCK_IDP_CONFIG,
                },
            },
        })

        expect(result.identityProviderConfig.identityProviderId).toBe(
            'example-idp'
        )
    })

    it('should call ledger client with a PATCH request', async () => {
        const LPM = await import('./LedgerProvider.js')
        const provider = new LPM.LedgerProvider({
            baseUrl: 'https://example.com',
            accessTokenProvider: tokenProvider,
        })

        const result = await provider.request<Ops.PatchV2IdpsIdpId>({
            method: 'ledgerApi',
            params: {
                requestMethod: 'patch',
                resource: '/v2/idps/{idp-id}',
                path: {
                    'idp-id': 'example-idp',
                },
                body: {
                    identityProviderConfig: MOCK_IDP_CONFIG,
                    updateMask: {
                        unknownFields: {
                            fields: {},
                        },
                    },
                },
            },
        })

        expect(result.identityProviderConfig.identityProviderId).toBe(
            'example-idp'
        )
    })

    it('should call ledger client with a DELETE request', async () => {
        const LPM = await import('./LedgerProvider.js')
        const provider = new LPM.LedgerProvider({
            baseUrl: 'https://example.com',
            accessTokenProvider: tokenProvider,
        })

        await expect(async () => {
            await provider.request<Ops.DeleteV2IdpsIdpId>({
                method: 'ledgerApi',
                params: {
                    requestMethod: 'delete',
                    resource: '/v2/idps/{idp-id}',
                    path: {
                        'idp-id': 'example-idp',
                    },
                },
            })
        }).rejects.toThrow('Unsupported request method: delete')
    })

    it('should fail on an unsupported method', async () => {
        const LPM = await import('./LedgerProvider.js')
        const provider = new LPM.LedgerProvider({
            baseUrl: 'https://example.com',
            accessTokenProvider: tokenProvider,
        })

        await expect(async () => {
            /* oxlint-disable typescript/no-explicit-any -- for testing invalid methods*/
            await provider.request({
                method: 'notexists',
                params: {},
            } as any)
        }).rejects.toThrow('Unsupported method: notexists')
    })

    it('should test query and upload params', async () => {
        const LPM = await import('./LedgerProvider.js')
        const provider = new LPM.LedgerProvider({
            baseUrl: 'https://example.com',
            accessTokenProvider: tokenProvider,
        })

        await expect(
            provider.request<Ops.PostV2DarsValidate>({
                method: 'ledgerApi',
                params: {
                    requestMethod: 'post',
                    resource: '/v2/dars/validate',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                    },
                    body: 'fake-dar-file-content',
                    query: {
                        synchronizerId: 'synchronizer-id-1',
                    },
                },
            })
        ).resolves.toEqual({})
    })
})
