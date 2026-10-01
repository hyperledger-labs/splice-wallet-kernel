// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import createClient, { type Client } from 'openapi-fetch'
import type { AccessTokenProvider } from '@canton-network/core-wallet-auth'

import type {
    components,
    paths,
} from './generated-clients/traffic-purchase-v1/traffic-purchase-v1.js'

// TODO: switch to logtape like the other core packages (see #2667)
type Logger = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>

/** The paymaster's purchaser contract, with the disclosures a purchase needs. */
export type TrafficPurchaserWithDisclosures =
    components['schemas']['TrafficPurchaserWithDisclosures']

/** One live rate, its terms, and the disclosures a purchase at it needs. */
export type ConversionRateWithDisclosures =
    components['schemas']['ConversionRateWithDisclosures']

/** A contract to disclose, as the Ledger API takes it. */
export type TrafficPurchaseDisclosedContract =
    components['schemas']['DisclosedContract']

/** The instrument a rate prices, as the Daml model keys it. */
export type TrafficPurchaseInstrumentId = components['schemas']['InstrumentId']

// A conditional type that filters the set of OpenAPI path names to those that actually have a
// defined GET operation. Any path without a GET is excluded via the `never` branch.
type GetEndpoint = {
    [Pathname in keyof paths]: paths[Pathname] extends {
        get: unknown
    }
        ? Pathname
        : never
}[keyof paths]

// Given a pathname (string) that has a GET, this helper type extracts the 200 response type from
// the OpenAPI definition.
export type GetResponse<Path extends GetEndpoint> = paths[Path] extends {
    get: { responses: { 200: { content: { 'application/json': infer Res } } } }
}
    ? Res
    : never

/**
 * A paymaster that answered, but not with what was asked for.
 *
 * Carries the HTTP status, which `TokenStandardClient` does not: a caller has to tell a paymaster
 * that simply does not sell this instrument (404) from one that is misconfigured (401/403) or
 * broken (5xx), and the error body alone does not say which. The body is kept as `unknown` rather
 * than typed as `ErrorResponse` because a server that is failing is exactly the one least likely
 * to honour its own schema.
 */
export class TrafficPurchaseApiError extends Error {
    constructor(
        readonly status: number,
        readonly body: unknown,
        message: string
    ) {
        super(message)
        this.name = 'TrafficPurchaseApiError'
    }
}

/**
 * The off-ledger API a traffic paymaster serves.
 *
 * Two reads, both of them about the paymaster's *own* contracts: the `TrafficPurchaser` a purchase
 * exercises, and the `ConversionRate` it buys at. Both come with the disclosures a submission has
 * to carry, which is the point of the API -- the paymaster is the sole signatory of both
 * templates, so a buyer cannot produce those blobs itself.
 *
 * Nothing here asks about the *payment*. That stays with the token registry, which is a different
 * server and a different API.
 */
export class TrafficPurchaseClient {
    // Private so `rollup-plugin-dts` elides the type rather than inlining the whole of
    // `openapi-fetch` into this package's declaration bundle.
    private readonly client: Client<paths>
    private readonly logger: Logger
    private readonly accessTokenProvider: AccessTokenProvider

    /** The paymaster this speaks to, for an error message to name. */
    public readonly url: string

    constructor(
        baseUrl: string,
        logger: Logger,
        accessTokenProvider: AccessTokenProvider
    ) {
        this.url = baseUrl
        this.accessTokenProvider = accessTokenProvider
        this.logger = logger
        this.logger.debug({ baseUrl }, 'TrafficPurchaseClient initialized')
        this.client = createClient<paths>({
            baseUrl,
            fetch: async (url: RequestInfo, options: RequestInit = {}) => {
                const accessToken =
                    await this.accessTokenProvider.getAccessToken()

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

    /** The `TrafficPurchaser` this paymaster sells through. */
    public async getTrafficPurchaser(): Promise<TrafficPurchaserWithDisclosures> {
        return this.get('/registry/traffic-purchase/v1/traffic-purchaser')
    }

    /**
     * The rate this paymaster sells traffic for one instrument at.
     *
     * Takes the `{ admin, id }` pair because that is what keys a rate; splitting it across the
     * path and the query is this API's business rather than a caller's, which is why it is done
     * here and not at the call site.
     */
    public async getConversionRate(
        instrumentId: TrafficPurchaseInstrumentId
    ): Promise<ConversionRateWithDisclosures> {
        return this.get(
            '/registry/traffic-purchase/v1/conversion-rates/{instrumentId}',
            {
                path: { instrumentId: instrumentId.id },
                query: { admin: instrumentId.admin },
            }
        )
    }

    private async get<Path extends GetEndpoint>(
        path: Path,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string | number>
        }
    ): Promise<GetResponse<Path>> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- (cant align this with openapi-fetch generics :shrug:)
        const options = { params } as any

        const resp = await this.client.GET(path, options)
        this.logger.debug({ path, params, response: resp }, `GET ${path}`)

        if (resp.data === undefined) {
            throw new TrafficPurchaseApiError(
                resp.response.status,
                resp.error,
                `The traffic paymaster at ${this.url} answered ` +
                    `${resp.response.status} for GET ${path}.`
            )
        }
        return resp.data as GetResponse<Path>
    }
}
