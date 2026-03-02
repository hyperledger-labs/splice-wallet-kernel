// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { components, paths } from './generated-clients/scan-proxy'
import createClient, { Client } from 'openapi-fetch'
import { Logger } from '@canton-network/core-types'
import { AccessTokenProvider } from '@canton-network/core-wallet-auth'

export type ScanProxyTypes = components['schemas']

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

export class ScanProxyClient {
    private readonly client: Client<paths>
    private readonly logger: Logger
    private readonly accessTokenProvider: AccessTokenProvider | undefined
    private readonly baseUrlHref: string
    // shared caches for all instances of ScanProxyClient
    private static amuletRulesCache = new Map<
        string,
        ScanProxyTypes['Contract']
    >()
    private static roundsCache = new Map<string, ScanProxyTypes['Contract'][]>()
    // one in-flight fetch per baseUrl for rules/rounds
    private static amuletRulesInflight = new Map<
        string,
        Promise<ScanProxyTypes['Contract']>
    >()
    private static roundsInflight = new Map<
        string,
        Promise<ScanProxyTypes['Contract'][]>
    >()
    // time after surpassing which mining rounds should be refreshed
    private static roundsNextChangeAt = new Map<string, number>()

    constructor(
        baseUrl: URL,
        logger: Logger,
        isAdmin: boolean,
        accessToken?: string,
        accessTokenProvider?: AccessTokenProvider
    ) {
        this.baseUrlHref = baseUrl.href
        this.accessTokenProvider = accessTokenProvider
        this.logger = logger
        this.logger.debug({ baseUrl }, 'ScanProxyClient initialized')
        this.client = createClient<paths>({
            baseUrl: baseUrl.href,
            fetch: async (url: RequestInfo, options: RequestInit = {}) => {
                if (this.accessTokenProvider) {
                    accessToken = isAdmin
                        ? await this.accessTokenProvider.getAdminAccessToken()
                        : await this.accessTokenProvider.getUserAccessToken()
                }
                return fetch(url, {
                    ...options,
                    headers: {
                        ...(options.headers || {}),
                        ...(accessToken
                            ? { Authorization: `Bearer ${accessToken}` }
                            : {}),
                        'Content-Type': 'application/json',
                    },
                })
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- (cant align this with openapi-fetch generics :shrug:)
        const options = { body, params } as any
        this.logger.debug({ requestBody: body }, `POST ${path}`)
        const resp = await this.client.POST(path, options)
        this.logger.debug({ requestBody: body, response: resp }, `POST ${path}`)
        return this.valueOrError(resp)
    }

    public async get<Path extends GetEndpoint>(
        path: Path,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string>
        }
    ): Promise<GetResponse<Path>> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- (cant align this with openapi-fetch generics :shrug:)
        const options = { params } as any

        const resp = await this.client.GET(path, options)
        this.logger.debug(
            { path: path, params: params, response: resp },
            `GET ${path}`
        )
        return this.valueOrError(resp)
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

    private async fetchAmuletRulesOnce(): Promise<ScanProxyTypes['Contract']> {
        const resp = await this.get('/v0/scan-proxy/amulet-rules')
        const contract = resp?.amulet_rules?.contract
        if (!contract?.contract_id || !contract?.template_id) {
            throw new Error('Malformed AmuletRules response')
        }
        ScanProxyClient.amuletRulesCache.set(this.baseUrlHref, contract)
        return contract
    }

    public async getAmuletRules(): Promise<ScanProxyTypes['Contract']> {
        const key = this.baseUrlHref

        const cached = ScanProxyClient.amuletRulesCache.get(key)
        // clone to prevent external mutation of cache by object reference
        if (cached) return structuredClone(cached)

        let inflight = ScanProxyClient.amuletRulesInflight.get(key)
        if (!inflight) {
            inflight = this.fetchAmuletRulesOnce().finally(() => {
                ScanProxyClient.amuletRulesInflight.delete(key)
            })
            ScanProxyClient.amuletRulesInflight.set(key, inflight)
        }

        const contract = await inflight
        return structuredClone(contract)
    }

    public static invalidateAmuletRulesCache(baseUrl: URL) {
        const key = baseUrl.href
        this.amuletRulesCache.delete(key)
        this.amuletRulesInflight.delete(key)
    }

    private computeNextChangeAt(rounds: ScanProxyTypes['Contract'][]): number {
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
        ScanProxyTypes['Contract'][]
    > {
        const resp = await this.get(
            '/v0/scan-proxy/open-and-issuing-mining-rounds'
        )
        const rounds = (resp.open_mining_rounds ?? []).map(
            (x) => x.contract
        ) as ScanProxyTypes['Contract'][]

        const key = this.baseUrlHref
        ScanProxyClient.roundsCache.set(key, rounds)
        ScanProxyClient.roundsNextChangeAt.set(
            key,
            this.computeNextChangeAt(rounds)
        )
        return rounds
    }

    private async refreshRounds(
        key: string
    ): Promise<ScanProxyTypes['Contract'][]> {
        let inflight = ScanProxyClient.roundsInflight.get(key)
        if (!inflight) {
            inflight = this.fetchOpenMiningRoundsOnce().finally(() => {
                ScanProxyClient.roundsInflight.delete(key)
            })
            ScanProxyClient.roundsInflight.set(key, inflight)
        }
        return inflight
    }

    public async getOpenMiningRounds(): Promise<ScanProxyTypes['Contract'][]> {
        const key = this.baseUrlHref
        const now = Date.now()
        const cached = ScanProxyClient.roundsCache.get(key)
        const next = ScanProxyClient.roundsNextChangeAt.get(key)

        if (cached && next !== undefined && now < next) {
            return structuredClone(cached)
        }
        const fresh = await this.refreshRounds(key)
        return structuredClone(fresh)
    }

    public async getActiveOpenMiningRound(): Promise<
        ScanProxyTypes['Contract'] | null
    > {
        const pickActive = (
            rounds: ScanProxyTypes['Contract'][],
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

    public async getAmuletSynchronizerId(): Promise<string | undefined> {
        type FutureValue = {
            decentralizedSynchronizer?: {
                activeSynchronizer?: string
            }
        }

        type Payload = {
            configSchedule?: {
                initialValue?: FutureValue
                futureValues?: FutureValue[]
            }
        }

        const amuletRules = await this.getAmuletRules()
        const payloadObj = amuletRules.payload as Payload

        const initActiveSynchronizer =
            payloadObj?.configSchedule?.initialValue?.decentralizedSynchronizer
                ?.activeSynchronizer
        const futureValues = payloadObj?.configSchedule?.futureValues

        if (Array.isArray(futureValues) && futureValues.length > 0) {
            let updatedValue: string | undefined = undefined
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

    public async isDevNet(): Promise<boolean> {
        const amuletRules = await this.getAmuletRules()
        const payload = amuletRules.payload as { isDevNet?: boolean }
        return payload?.isDevNet ?? false
    }
}
