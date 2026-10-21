// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Stands in for the off-ledger API a paymaster serves.
 *
 * `api-specs/traffic-purchase/v1/traffic-purchase-v1.yaml` describes two reads a
 * buyer makes before a purchase, and `TrafficPurchaseClient` is the buyer's half
 * of them. This is the paymaster's half: the two endpoints answered off the
 * paymaster's own ledger state, so `purchaseTraffic({ paymasterApiUrl })` has
 * something real to ask instead of being handed the terms out of band.
 *
 * It is the whole of what the API needs, because the SDK already is: the terms
 * come from `traffic.readTrafficSetup` and the disclosures -- the reason the API
 * exists, since only the paymaster can produce them -- from `ledger.disclose`.
 *
 * The ledger is read per request rather than at startup, which is both simpler
 * and what a paymaster that reprices has to do anyway: repricing replaces the
 * `ConversionRate`, so a cached contract id would go stale.
 *
 * Test-grade on purpose: one paymaster, no caching, and no authentication --
 * a real one would check the bearer token `paymasterAuth` sends.
 */
import { createServer, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import type {
    ConversionRateWithDisclosures,
    TrafficPurchaseDisclosedContract,
    TrafficPurchaserWithDisclosures,
} from '@canton-network/core-traffic-purchase'
import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'
import type { PartyId } from '@canton-network/core-types'
import type { LedgerNamespace } from '../../ledger/namespace.js'
import type { TrafficAccountNamespace } from '../namespace.js'
import type { ContractIdString } from '../types.js'

const BASE_PATH = '/registry/traffic-purchase/v1'
const RATES_PATH = `${BASE_PATH}/conversion-rates/`

/** A failure with the status the spec gives it. Anything else is a 500. */
class ApiError extends Error {
    constructor(
        readonly status: number,
        message: string
    ) {
        super(message)
    }
}

export class TrafficPaymasterApi {
    private readonly server: Server

    /** Base URL to pass as `purchaseTraffic`'s `paymasterApiUrl`. */
    public readonly url: string

    private constructor(
        private readonly traffic: Pick<
            TrafficAccountNamespace,
            'readTrafficSetup'
        >,
        private readonly ledger: Pick<LedgerNamespace, 'disclose'>,
        private readonly paymaster: PartyId,
        server: Server
    ) {
        this.server = server
        this.server.on('request', (request, response) => {
            void this.answer(request.url ?? '', response)
        })
        this.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    }

    /** Listens on an ephemeral loopback port, so parallel tests cannot collide. */
    static async start(options: {
        /** Reads the paymaster's `TrafficPurchaser` and `ConversionRate`s. */
        traffic: Pick<TrafficAccountNamespace, 'readTrafficSetup'>
        /** Produces the blobs, which only a party that can read them can. */
        ledger: Pick<LedgerNamespace, 'disclose'>
        /** The party selling traffic, and sole signatory of both templates. */
        paymaster: PartyId
    }): Promise<TrafficPaymasterApi> {
        const server = createServer()
        await new Promise<void>((resolve) =>
            server.listen(0, '127.0.0.1', resolve)
        )
        return new TrafficPaymasterApi(
            options.traffic,
            options.ledger,
            options.paymaster,
            server
        )
    }

    async stop(): Promise<void> {
        // `close` only stops new connections and then waits for the open ones,
        // and the client's are keep-alive -- so without this the test's
        // `finally` blocks until the sockets time out rather than returning.
        this.server.closeAllConnections()
        await new Promise<void>((resolve) => this.server.close(() => resolve()))
    }

    private async answer(
        target: string,
        response: ServerResponse
    ): Promise<void> {
        try {
            // A relative request target needs a base to parse against; the
            // host it names is the one that was dialled, so it is immaterial.
            send(response, 200, await this.route(new URL(target, this.url)))
        } catch (error) {
            send(
                response,
                error instanceof ApiError ? error.status : 500,
                error instanceof Error
                    ? { error: error.message }
                    : { error: String(error) }
            )
        }
    }

    private async route(url: URL): Promise<unknown> {
        if (url.pathname === `${BASE_PATH}/traffic-purchaser`) {
            return this.trafficPurchaser()
        }
        if (url.pathname.startsWith(RATES_PATH)) {
            const admin = url.searchParams.get('admin')
            if (admin === null) {
                throw new ApiError(
                    400,
                    'admin is required: a rate is keyed by the instrument’s { admin, id } ' +
                        'pair, and an id on its own does not identify an instrument.'
                )
            }
            return this.conversionRate(
                decodeURIComponent(url.pathname.slice(RATES_PATH.length)),
                admin
            )
        }
        throw new ApiError(
            404,
            `No traffic-purchase endpoint at ${url.pathname}.`
        )
    }

    private async trafficPurchaser(): Promise<TrafficPurchaserWithDisclosures> {
        const { trafficPurchasers } = await this.traffic.readTrafficSetup(
            this.paymaster
        )
        const purchaser = this.theOnly(trafficPurchasers, 'TrafficPurchaser')

        if (purchaser.paymasterReceiver === undefined) {
            // Not a 404: the purchaser is there, it is this server that cannot
            // read its arguments, and a buyer cannot ask the registry about a
            // transfer without knowing who it pays.
            throw new ApiError(
                500,
                `The TrafficPurchaser ${purchaser.contractId} does not name a receiver this ` +
                    'SDK can read.'
            )
        }

        return {
            trafficPurchaserId: purchaser.contractId,
            paymaster: this.paymaster,
            paymasterReceiver: purchaser.paymasterReceiver,
            disclosedContracts: await this.disclose(purchaser.contractId),
        }
    }

    private async conversionRate(
        id: string,
        admin: string
    ): Promise<ConversionRateWithDisclosures> {
        const { conversionRates } = await this.traffic.readTrafficSetup(
            this.paymaster
        )
        const rate = this.theOnly(
            conversionRates.filter(
                (candidate) =>
                    candidate.instrumentId.id === id &&
                    candidate.instrumentId.admin === admin
            ),
            `ConversionRate for ${id} administered by ${admin}`
        )

        return {
            conversionRateId: rate.contractId,
            instrumentId: rate.instrumentId,
            conversionRate: rate.conversionRate,
            // A Daml `None` is absent rather than null, here as on the ledger.
            ...(rate.expiresAt === undefined
                ? {}
                : { expiresAt: rate.expiresAt }),
            ...(rate.maxTrafficPerPurchase === undefined
                ? {}
                : { maxTrafficPerPurchase: rate.maxTrafficPerPurchase }),
            disclosedContracts: await this.disclose(rate.contractId),
        }
    }

    private async disclose(
        contractId: ContractIdString
    ): Promise<TrafficPurchaseDisclosedContract[]> {
        const disclosed = await this.ledger.disclose({
            contractIds: [contractId],
            asParty: this.paymaster,
        })
        return disclosed.map(served)
    }

    /**
     * The one contract of its kind, refusing both none and several.
     *
     * Several is a 500 and not a guess, for the reason `setup` refuses the same
     * shape: picking one would sell different buyers a different contract.
     */
    private theOnly<T>(found: T[], what: string): T {
        const [first, ...rest] = found
        if (first === undefined) {
            throw new ApiError(404, `${this.paymaster} has no ${what}.`)
        }
        if (rest.length > 0) {
            throw new ApiError(
                500,
                `${this.paymaster} has ${found.length} of what should be one ${what}, so ` +
                    'there is no one answer to give.'
            )
        }
        return first
    }
}

/**
 * One disclosure as the spec reports it.
 *
 * The Ledger API's own schema marks every field but the blob optional, while
 * the spec requires all four -- a submission carrying a disclosure without them
 * is rejected -- so they are checked rather than cast.
 */
function served(
    contract: LedgerCommonSchemas['DisclosedContract']
): TrafficPurchaseDisclosedContract {
    const { templateId, contractId, createdEventBlob, synchronizerId } =
        contract
    if (
        templateId === undefined ||
        contractId === undefined ||
        synchronizerId === undefined
    ) {
        throw new ApiError(
            500,
            `The disclosure for ${contractId ?? 'a contract'} is missing fields a buyer’s ` +
                'submission needs.'
        )
    }
    return { templateId, contractId, createdEventBlob, synchronizerId }
}

function send(response: ServerResponse, status: number, body: unknown): void {
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(body))
}
