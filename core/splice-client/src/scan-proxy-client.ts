// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
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
    private accessTokenProvider: AccessTokenProvider | undefined
    private baseUrlHref: string
    // shared cache for all instances of ScanProxyClient
    private static amuletRulesCache = new Map<
        string,
        ScanProxyTypes['Contract']
    >()
    // one promise for all calls that trigger fetching amulet rules before it's cached
    private static amuletRulesInflight = new Map<
        string,
        Promise<ScanProxyTypes['Contract']>
    >()

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

    public async getOpenMiningRounds(): Promise<ScanProxyTypes['Contract'][]> {
        const openAndIssuingMiningRounds = await this.get(
            '/v0/scan-proxy/open-and-issuing-mining-rounds'
        )
        return openAndIssuingMiningRounds.open_mining_rounds.map(
            (openMiningRound) => openMiningRound.contract
        )
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
}
