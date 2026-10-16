// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScanClient } from './scan-client.js'
import {
    createAccessTokenProvider,
    getRequestHeaders,
    getRequestMethod,
    jsonResponse,
} from './test-utils.js'

const BASE_URL = new URL('https://scan.example/')

const amuletRulesContract = {
    contract_id: 'amulet-rules-cid',
    template_id: 'AmuletRules:template',
    payload: {
        isDevNet: true,
        configSchedule: {
            initialValue: {
                decentralizedSynchronizer: {
                    activeSynchronizer: 'sync-init',
                },
            },
            futureValues: [
                {
                    decentralizedSynchronizer: {
                        activeSynchronizer: 'sync-future',
                    },
                },
            ],
        },
    },
}

const amuletRulesResponse = {
    amulet_rules_update: {
        contract: amuletRulesContract,
        domain_id: 'domain-id',
    },
}

function miningRound(
    contractId: string,
    opensAt: string,
    targetClosesAt: string
) {
    return {
        contract: {
            contract_id: contractId,
            template_id: 'OpenMiningRound:template',
            payload: {
                opensAt,
                targetClosesAt,
            },
        },
    }
}

describe('ScanClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'))
    })

    afterEach(() => {
        ScanClient.invalidateAmuletRulesCache(BASE_URL)
        ScanClient.invalidateOpenMiningRoundsCache(BASE_URL)
        ScanClient.invalidateAmuletRulesCache(BASE_URL)
        ScanClient.invalidateOpenMiningRoundsCache(BASE_URL)
        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    function createClient(baseUrl = BASE_URL) {
        return new ScanClient(baseUrl, createAccessTokenProvider())
    }

    it('fetches amulet rules and caches subsequent requests', async () => {
        fetchMock.mockResolvedValue(jsonResponse(amuletRulesResponse))

        const client = createClient()
        const first = await client.getAmuletRules()
        const second = await client.getAmuletRules()

        expect(first).toEqual(amuletRulesContract)
        expect(second).toEqual(amuletRulesContract)
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('returns cloned amulet rules so callers cannot mutate the cache', async () => {
        fetchMock.mockResolvedValue(jsonResponse(amuletRulesResponse))

        const client = createClient()
        const first = await client.getAmuletRules()
        first.payload.isDevNet = false as never

        const second = await client.getAmuletRules()
        expect(second.payload.isDevNet).toBe(true)
    })

    it('deduplicates concurrent amulet rules fetches', async () => {
        let resolveFetch: (value: Response) => void = () => undefined
        const fetchPromise = new Promise<Response>((resolve) => {
            resolveFetch = resolve
        })
        fetchMock.mockReturnValue(fetchPromise)

        const client = createClient()
        const firstPromise = client.getAmuletRules()
        const secondPromise = client.getAmuletRules()

        resolveFetch!(jsonResponse(amuletRulesResponse))

        const [first, second] = await Promise.all([firstPromise, secondPromise])

        expect(first).toEqual(amuletRulesContract)
        expect(second).toEqual(amuletRulesContract)
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('throws when amulet rules response is malformed', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                amulet_rules_update: {
                    contract: {
                        contract_id: 'missing-template',
                    },
                },
            })
        )

        const client = createClient()

        await expect(client.getAmuletRules()).rejects.toThrow()
    })

    it('invalidates amulet rules cache', async () => {
        fetchMock.mockImplementation(() => jsonResponse(amuletRulesResponse))

        const client = createClient()
        await client.getAmuletRules()
        ScanClient.invalidateAmuletRulesCache(BASE_URL)
        await client.getAmuletRules()

        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('caches open mining rounds until the next schedule change', async () => {
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse({
                    open_mining_rounds: [
                        miningRound(
                            'round-1',
                            '2026-01-15T14:00:00.000Z',
                            '2026-01-15T16:00:00.000Z'
                        ),
                    ],
                })
            )
            .mockResolvedValueOnce(
                jsonResponse({
                    open_mining_rounds: [
                        miningRound(
                            'round-2',
                            '2026-01-15T14:00:00.000Z',
                            '2026-01-15T16:00:00.000Z'
                        ),
                    ],
                })
            )

        const client = createClient()
        const first = await client.getOpenMiningRounds()
        const second = await client.getOpenMiningRounds()

        expect(first[0]?.contract_id).toBe('round-1')
        expect(second[0]?.contract_id).toBe('round-1')
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('returns isDevNet from cached amulet rules payload', async () => {
        fetchMock.mockResolvedValue(jsonResponse(amuletRulesResponse))

        const client = createClient()

        await expect(client.isDevNet()).resolves.toBe(true)
    })

    it('returns false from isDevNet when payload flag is missing', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                amulet_rules_update: {
                    contract: {
                        contract_id: 'amulet-rules-cid',
                        template_id: 'AmuletRules:template',
                        payload: {},
                    },
                },
            })
        )

        const client = createClient()

        await expect(client.isDevNet()).resolves.toBe(false)
    })

    it('invalidates open mining rounds cache', async () => {
        fetchMock.mockImplementation(() =>
            jsonResponse({
                open_mining_rounds: [
                    miningRound(
                        'round-1',
                        '2026-01-15T14:00:00.000Z',
                        '2026-01-15T16:00:00.000Z'
                    ),
                ],
            })
        )

        const client = createClient()
        await client.getOpenMiningRounds()
        ScanClient.invalidateOpenMiningRoundsCache(BASE_URL)
        await client.getOpenMiningRounds()

        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('sends Authorization header on GET when access token is available', async () => {
        const accessTokenProvider = createAccessTokenProvider('scan-token')
        fetchMock.mockResolvedValue(jsonResponse({ dso: 'DSO::abc' }))

        const client = new ScanClient(BASE_URL, accessTokenProvider)
        await client.get('/v0/dso-party-id')

        expect(accessTokenProvider.getAccessToken).toHaveBeenCalledOnce()
        const headers = getRequestHeaders(fetchMock, '/v0/dso-party-id')
        expect(headers.authorization).toBe('Bearer scan-token')
        expect(headers['content-type']).toBe('application/json')
    })

    it('omits Authorization header on GET when access token is unavailable', async () => {
        const accessTokenProvider = createAccessTokenProvider(undefined)
        fetchMock.mockResolvedValue(jsonResponse({ dso: 'DSO::abc' }))

        const client = new ScanClient(BASE_URL, accessTokenProvider)
        await client.get('/v0/dso-party-id')

        const headers = getRequestHeaders(fetchMock, '/v0/dso-party-id')
        expect(headers.authorization).toBeUndefined()
        expect(headers['content-type']).toBe('application/json')
    })

    it('returns parsed GET response data', async () => {
        const responseBody = { dso_party_id: 'DSO::party' }
        fetchMock.mockResolvedValue(jsonResponse(responseBody))

        const client = new ScanClient(BASE_URL, createAccessTokenProvider())
        const result = await client.get('/v0/dso-party-id')

        expect(result).toEqual(responseBody)
    })

    it('returns parsed POST response data', async () => {
        const responseBody = { updates: [] }
        fetchMock.mockResolvedValue(jsonResponse(responseBody))

        const client = new ScanClient(BASE_URL, createAccessTokenProvider())
        const result = await client.post('/v2/updates', { page_size: 200 })

        expect(result).toEqual(responseBody)
        expect(getRequestMethod(fetchMock, '/v2/updates')).toBe('POST')
    })

    it('rejects when the API returns an error response', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ message: 'not found' }, 404))

        const client = new ScanClient(BASE_URL, createAccessTokenProvider())

        await expect(client.get('/v0/dso-party-id')).rejects.toBeDefined()
    })

    it('returns initial active synchronizer when no future values exist', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                amulet_rules: {
                    contract: {
                        payload: {
                            configSchedule: {
                                initialValue: {
                                    decentralizedSynchronizer: {
                                        activeSynchronizer: 'sync-init',
                                    },
                                },
                                futureValues: [],
                            },
                        },
                    },
                },
            })
        )

        const client = new ScanClient(BASE_URL, createAccessTokenProvider())

        await expect(client.getAmuletSynchronizerId()).resolves.toBe(
            'sync-init'
        )
    })

    it('returns last future active synchronizer when future values exist', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                amulet_rules: {
                    contract: {
                        payload: {
                            configSchedule: {
                                initialValue: {
                                    decentralizedSynchronizer: {
                                        activeSynchronizer: 'sync-init',
                                    },
                                },
                                futureValues: [
                                    {
                                        decentralizedSynchronizer: {
                                            activeSynchronizer: 'sync-future-1',
                                        },
                                    },
                                    {
                                        decentralizedSynchronizer: {
                                            activeSynchronizer: 'sync-future-2',
                                        },
                                    },
                                ],
                            },
                        },
                    },
                },
            })
        )

        const client = new ScanClient(BASE_URL, createAccessTokenProvider())

        await expect(client.getAmuletSynchronizerId()).resolves.toBe(
            'sync-future-2'
        )
    })
})
