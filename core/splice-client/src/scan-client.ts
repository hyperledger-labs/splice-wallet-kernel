// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { components, paths } from './generated-clients/scan'
import createClient, { type Client } from 'openapi-fetch'
import type { AccessTokenProvider } from '@canton-network/core-wallet-auth'
import { getLogger } from '@logtape/logtape'

export type ScanTypes = components['schemas']

// A conditional type that filters the set of OpenAPI path names to those that actually have a defined POST operation.
// Any path without a POST is excluded via the `never` branch of the conditional
type PostEndpoint = {
    [Pathname in keyof paths]: paths[Pathname] extends {
        post: unknown
    }
        ? Pathname
        : never
}[keyof paths]

// Given a pathname (string) that has a POST, this helper type extracts the request body type from the OpenAPI definition.
export type PostRequest<Path extends PostEndpoint> = paths[Path] extends {
    post: { requestBody: { content: { 'application/json': infer Req } } }
}
    ? Req
    : never

// Given a pathname (string) that has a POST, this helper type extracts the 200 response type from the OpenAPI definition.
export type PostResponse<Path extends PostEndpoint> = paths[Path] extends {
    post: { responses: { 200: { content: { 'application/json': infer Res } } } }
}
    ? Res
    : never

// Similar as above, for GETs
type GetEndpoint = {
    [Pathname in keyof paths]: paths[Pathname] extends {
        get: unknown
    }
        ? Pathname
        : never
}[keyof paths]

// Similar as above, for GETs
export type GetResponse<Path extends GetEndpoint> = paths[Path] extends {
    get: { responses: { 200: { content: { 'application/json': infer Res } } } }
}
    ? Res
    : never

export class ScanClient {
    private logger = getLogger(['core', 'splice-client', 'ScanClient'])
    private readonly client: Client<paths>
    private readonly accessTokenProvider: AccessTokenProvider
    private readonly baseUrlHref: string

    private static amuletRulesCache = new Map<string, ScanTypes['Contract']>()

    private static roundsCache = new Map<string, ScanTypes['Contract'][]>()
    // one in-flight fetch per baseUrl for rules/rounds
    private static amuletRulesInflight = new Map<
        string,
        Promise<ScanTypes['Contract']>
    >()
    private static roundsInflight = new Map<
        string,
        Promise<ScanTypes['Contract'][]>
    >()

    // time after surpassing which mining rounds should be refreshed
    private static roundsNextChangeAt = new Map<string, number>()

    constructor(baseUrl: URL, accessTokenProvider: AccessTokenProvider) {
        this.baseUrlHref = baseUrl.href
        this.accessTokenProvider = accessTokenProvider

        this.logger.debug('ScanClient initialized', { baseUrl })
        this.client = createClient<paths>({
            baseUrl: baseUrl.href,
            fetch: async (url: RequestInfo, options: RequestInit = {}) => {
                const accessToken =
                    await this.accessTokenProvider.getAccessToken()

                const headers = new Headers(options.headers)
                if (accessToken) {
                    headers.set('Authorization', `Bearer ${accessToken}`)
                }
                headers.set('Content-Type', 'application/json')

                return fetch(url, { ...options, headers })
            },
        })
    }

    public async post<Path extends PostEndpoint>(
        path: Path,
        body: PostRequest<Path>,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string>
        }
    ): Promise<PostResponse<Path>> {
        // oxlint-disable-next-line typescript/no-explicit-any -- (cant align this with openapi-fetch generics :shrug:)
        const options = { body, params } as any

        this.logger.debug('POST {path} request', {
            path,
            requestBody: body,
        })

        const response = await this.client.POST(path, options)

        this.logger.debug('POST {path} response', {
            path,
            response,
        })

        return this.valueOrError(response)
    }

    public async get<Path extends GetEndpoint>(
        path: Path,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string>
        }
    ): Promise<GetResponse<Path>> {
        // oxlint-disable-next-line typescript/no-explicit-any -- (cant align this with openapi-fetch generics :shrug:)
        const options = { params } as any

        this.logger.debug('GET {path} request', { path, params })

        const response = await this.client.GET(path, options)

        this.logger.debug('GET {path} response', { path, response })

        return this.valueOrError(response)
    }

    private async valueOrError<T>(response: {
        data?: T
        error?: unknown
    }): Promise<T> {
        if (response.data === undefined) {
            return Promise.reject(response.error)
        } else {
            return Promise.resolve(response.data)
        }
    }

    public async getAmuletSynchronizerId(): Promise<string | undefined> {
        const dsoInfo = await this.get('/v0/dso')

        const payloadObj = JSON.parse(
            JSON.stringify(dsoInfo.amulet_rules.contract.payload)
        )

        const initActiveSynchronizer =
            payloadObj?.configSchedule?.initialValue?.decentralizedSynchronizer
                ?.activeSynchronizer
        const futureValues = payloadObj?.configSchedule?.futureValues as []

        if (futureValues.length > 0) {
            let updatedValue = undefined
            for (const value of futureValues) {
                const parsed = JSON.parse(JSON.stringify(value))
                if (parsed?.decentralizedSynchronizer?.activeSynchronizer) {
                    updatedValue =
                        parsed.decentralizedSynchronizer.activeSynchronizer
                }
            }
            return updatedValue ?? initActiveSynchronizer
        } else return initActiveSynchronizer
    }

    private async fetchAmuletRulesOnce(): Promise<ScanTypes['Contract']> {
        const resp = await this.post('/v0/amulet-rules', {})
        const contract = resp.amulet_rules_update.contract
        if (!contract?.contract_id || !contract?.template_id) {
            throw new Error('Malformed AmuletRules response')
        }
        ScanClient.amuletRulesCache.set(this.baseUrlHref, contract)
        return contract
    }

    public async getAmuletRules(): Promise<ScanTypes['Contract']> {
        const key = this.baseUrlHref

        const cached = ScanClient.amuletRulesCache.get(key)
        // clone to prevent external mutation of cache by object reference
        if (cached) return structuredClone(cached)

        let inflight = ScanClient.amuletRulesInflight.get(key)
        if (!inflight) {
            inflight = this.fetchAmuletRulesOnce().finally(() => {
                ScanClient.amuletRulesInflight.delete(key)
            })
            ScanClient.amuletRulesInflight.set(key, inflight)
        }

        const contract = await inflight
        return structuredClone(contract)
    }

    public static invalidateAmuletRulesCache(baseUrl: URL) {
        const key = baseUrl.href
        this.amuletRulesCache.delete(key)
        this.amuletRulesInflight.delete(key)
    }

    private computeNextChangeAt(rounds: ScanTypes['Contract'][]): number {
        const now = Date.now()
        let next = Number.POSITIVE_INFINITY

        for (const round of rounds) {
            const { opensAt, targetClosesAt } = round.payload ?? {}
            const openMs = opensAt ? Number(new Date(opensAt)) : NaN
            const closeMs = targetClosesAt
                ? Number(new Date(targetClosesAt))
                : NaN

            if (Number.isFinite(openMs) && openMs > now && openMs < next) {
                next = openMs
            }
            if (Number.isFinite(closeMs) && closeMs > now && closeMs < next) {
                next = closeMs
            }
        }

        // If we couldn't parse anything sensible, force an immediate refresh.
        return Number.isFinite(next) ? next : now
    }

    private async fetchOpenMiningRoundsOnce(): Promise<
        ScanTypes['Contract'][]
    > {
        const resp = await this.post('/v0/open-and-issuing-mining-rounds', {
            cached_open_mining_round_contract_ids: [],
            cached_issuing_round_contract_ids: [],
        })

        const rounds = Object.values(resp.open_mining_rounds).flatMap((x) =>
            x.contract ? [x.contract] : []
        )

        const key = this.baseUrlHref
        ScanClient.roundsCache.set(key, rounds)
        ScanClient.roundsNextChangeAt.set(key, this.computeNextChangeAt(rounds))
        return rounds
    }

    private async refreshRounds(key: string): Promise<ScanTypes['Contract'][]> {
        let inflight = ScanClient.roundsInflight.get(key)
        if (!inflight) {
            inflight = this.fetchOpenMiningRoundsOnce().finally(() => {
                ScanClient.roundsInflight.delete(key)
            })
            ScanClient.roundsInflight.set(key, inflight)
        }
        return inflight
    }

    public async getOpenMiningRounds(): Promise<ScanTypes['Contract'][]> {
        const key = this.baseUrlHref
        const now = Date.now()
        const cached = ScanClient.roundsCache.get(key)
        const next = ScanClient.roundsNextChangeAt.get(key)

        if (cached && next !== undefined && now < next) {
            return structuredClone(cached)
        }
        const fresh = await this.refreshRounds(key)
        return structuredClone(fresh)
    }

    public async getActiveOpenMiningRound(): Promise<
        ScanTypes['Contract'] | null
    > {
        const pickActive = (
            rounds: ScanTypes['Contract'][],
            timestamp: number
        ) =>
            rounds
                .filter((round) => {
                    const { opensAt, targetClosesAt } = round.payload
                    const openMs = opensAt ? Number(new Date(opensAt)) : NaN
                    const closeMs = targetClosesAt
                        ? Number(new Date(targetClosesAt))
                        : NaN
                    return (
                        Number.isFinite(openMs) &&
                        Number.isFinite(closeMs) &&
                        openMs <= timestamp &&
                        timestamp < closeMs
                    )
                })
                .sort((a, b) => a.payload.opensAt - b.payload.opensAt)
                .at(-1) ?? null

        const now = Date.now()
        const rounds = await this.getOpenMiningRounds()
        const active = pickActive(rounds, now)
        return active ? structuredClone(active) : null
    }

    public static invalidateOpenMiningRoundsCache(baseUrl: URL) {
        const key = baseUrl.href
        this.roundsCache.delete(key)
        this.roundsInflight.delete(key)
        this.roundsNextChangeAt.delete(key)
    }

    public async isDevNet(): Promise<boolean> {
        const amuletRules = await this.getAmuletRules()
        const payload = amuletRules.payload as { isDevNet?: boolean }
        return payload?.isDevNet ?? false
    }
}
