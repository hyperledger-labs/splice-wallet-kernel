// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScanProxyClient } from './scan-proxy-client.js'
import { createAccessTokenProvider, jsonResponse } from './test-utils.js'

const BASE_URL = new URL('https://scan.proxy.example/')

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
    amulet_rules: {
        contract: amuletRulesContract,
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

describe('ScanProxyClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>
    const proxyBaseUrl = new URL('https://scan-proxy.example/')

    beforeEach(() => {
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'))
    })

    afterEach(() => {
        ScanProxyClient.invalidateAmuletRulesCache(proxyBaseUrl)
        ScanProxyClient.invalidateOpenMiningRoundsCache(proxyBaseUrl)
        ScanProxyClient.invalidateAmuletRulesCache(BASE_URL)
        ScanProxyClient.invalidateOpenMiningRoundsCache(BASE_URL)
        vi.useRealTimers()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    function createClient(baseUrl = proxyBaseUrl) {
        return new ScanProxyClient(baseUrl, createAccessTokenProvider())
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
                amulet_rules: {
                    contract: {
                        contract_id: 'missing-template',
                    },
                },
            })
        )

        const client = createClient()

        await expect(client.getAmuletRules()).rejects.toThrow(
            'Malformed AmuletRules response'
        )
    })

    it('invalidates amulet rules cache', async () => {
        fetchMock.mockImplementation(() => jsonResponse(amuletRulesResponse))

        const client = createClient()
        await client.getAmuletRules()
        ScanProxyClient.invalidateAmuletRulesCache(proxyBaseUrl)
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

    it('returns the active open mining round for the current time', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                open_mining_rounds: [
                    miningRound(
                        'round-old',
                        '2026-01-15T10:00:00.000Z',
                        '2026-01-15T11:00:00.000Z'
                    ),
                    miningRound(
                        'round-active',
                        '2026-01-15T11:30:00.000Z',
                        '2026-01-15T13:00:00.000Z'
                    ),
                    miningRound(
                        'round-future',
                        '2026-01-15T13:00:00.000Z',
                        '2026-01-15T15:00:00.000Z'
                    ),
                ],
            })
        )

        const client = createClient()
        const active = await client.getActiveOpenMiningRound()

        expect(active?.contract_id).toBe('round-active')
    })

    it('returns null when no open mining round is active', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                open_mining_rounds: [
                    miningRound(
                        'round-future',
                        '2026-01-15T13:00:00.000Z',
                        '2026-01-15T15:00:00.000Z'
                    ),
                ],
            })
        )

        const client = createClient()

        await expect(client.getActiveOpenMiningRound()).resolves.toBeNull()
    })

    it('returns isDevNet from cached amulet rules payload', async () => {
        fetchMock.mockResolvedValue(jsonResponse(amuletRulesResponse))

        const client = createClient()

        await expect(client.isDevNet()).resolves.toBe(true)
    })

    it('returns false from isDevNet when payload flag is missing', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                amulet_rules: {
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

    it('returns future active synchronizer from cached amulet rules', async () => {
        fetchMock.mockResolvedValue(jsonResponse(amuletRulesResponse))

        const client = createClient()

        await expect(client.getAmuletSynchronizerId()).resolves.toBe(
            'sync-future'
        )
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
        ScanProxyClient.invalidateOpenMiningRoundsCache(proxyBaseUrl)
        await client.getOpenMiningRounds()

        expect(fetchMock).toHaveBeenCalledTimes(2)
    })
})
