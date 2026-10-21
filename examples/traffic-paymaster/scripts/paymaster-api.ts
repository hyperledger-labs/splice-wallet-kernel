// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * The off-ledger API a traffic paymaster serves, adapted from `wallet-sdk`'s
 * own `TrafficPaymasterApi` test double (that one is private to the SDK
 * package, not published). Answers the two reads a buyer makes before a
 * purchase -- the `TrafficPurchaser` contract and the going `ConversionRate`
 * -- both read fresh off the ledger and disclosed, since only the paymaster
 * can produce those blobs. Test-grade: one paymaster, no caching, no auth.
 */
import { createServer, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import type {
    ConversionRateWithDisclosures,
    TrafficPurchaserWithDisclosures,
} from '@canton-network/core-traffic-purchase'
import type { PartyId } from '@canton-network/core-types'
import type { AdminSdk } from './lib.js'

const BASE_PATH = '/registry/traffic-purchase/v1'
const RATES_PATH = `${BASE_PATH}/conversion-rates/`

class ApiError extends Error {
    readonly status: number

    constructor(status: number, message: string) {
        super(message)
        this.status = status
    }
}

export class PaymasterApi {
    private readonly server: Server
    private readonly traffic: AdminSdk['traffic']
    private readonly ledger: AdminSdk['ledger']
    private readonly paymaster: PartyId
    public readonly url: string

    private constructor(
        traffic: AdminSdk['traffic'],
        ledger: AdminSdk['ledger'],
        paymaster: PartyId,
        server: Server
    ) {
        this.traffic = traffic
        this.ledger = ledger
        this.paymaster = paymaster
        this.server = server
        this.server.on('request', (request, response) => {
            // The UI calls this server directly from the browser, cross-origin
            // -- CORS headers on every response, and a short-circuit for the
            // preflight OPTIONS request a browser's own fetch sends ahead of it.
            response.setHeader('Access-Control-Allow-Origin', '*')
            response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
            response.setHeader('Access-Control-Allow-Headers', 'Content-Type')
            if (request.method === 'OPTIONS') {
                response.writeHead(204)
                response.end()
                return
            }
            void this.answer(request.url ?? '', response)
        })
        this.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    }

    static async start(options: {
        traffic: AdminSdk['traffic']
        ledger: AdminSdk['ledger']
        paymaster: PartyId
        port?: number
    }): Promise<PaymasterApi> {
        const server = createServer()
        await new Promise<void>((resolve) =>
            server.listen(options.port ?? 0, '127.0.0.1', resolve)
        )
        return new PaymasterApi(
            options.traffic,
            options.ledger,
            options.paymaster,
            server
        )
    }

    async stop(): Promise<void> {
        this.server.closeAllConnections()
        await new Promise<void>((resolve) => this.server.close(() => resolve()))
    }

    private async answer(
        target: string,
        response: ServerResponse
    ): Promise<void> {
        try {
            const body = await this.route(new URL(target, this.url))
            send(response, 200, body)
        } catch (error) {
            send(
                response,
                error instanceof ApiError ? error.status : 500,
                { error: error instanceof Error ? error.message : String(error) }
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
                throw new ApiError(400, 'admin query param is required')
            }
            return this.conversionRate(
                decodeURIComponent(url.pathname.slice(RATES_PATH.length)),
                admin
            )
        }
        throw new ApiError(404, `No traffic-purchase endpoint at ${url.pathname}`)
    }

    private async trafficPurchaser(): Promise<TrafficPurchaserWithDisclosures> {
        const { trafficPurchasers } = await this.traffic.readTrafficSetup(
            this.paymaster
        )
        const purchaser = this.theOnly(trafficPurchasers, 'TrafficPurchaser')
        if (purchaser.paymasterReceiver === undefined) {
            throw new ApiError(
                500,
                `TrafficPurchaser ${purchaser.contractId} has no readable receiver`
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
            `ConversionRate for ${id}/${admin}`
        )
        return {
            conversionRateId: rate.contractId,
            instrumentId: rate.instrumentId,
            conversionRate: rate.conversionRate,
            ...(rate.expiresAt === undefined
                ? {}
                : { expiresAt: rate.expiresAt }),
            ...(rate.maxTrafficPerPurchase === undefined
                ? {}
                : { maxTrafficPerPurchase: rate.maxTrafficPerPurchase }),
            disclosedContracts: await this.disclose(rate.contractId),
        }
    }

    private async disclose(forContractId: string) {
        const disclosed = await this.ledger.disclose({
            contractIds: [forContractId],
            asParty: this.paymaster,
        })
        return disclosed.map((contract) => {
            const { templateId, contractId, createdEventBlob, synchronizerId } =
                contract
            if (
                templateId === undefined ||
                contractId === undefined ||
                synchronizerId === undefined
            ) {
                throw new ApiError(
                    500,
                    `Disclosure for ${contractId ?? 'a contract'} is missing fields`
                )
            }
            return { templateId, contractId, createdEventBlob, synchronizerId }
        })
    }

    private theOnly<T>(found: T[], what: string): T {
        const [first, ...rest] = found
        if (first === undefined) {
            throw new ApiError(404, `${this.paymaster} has no ${what}`)
        }
        if (rest.length > 0) {
            throw new ApiError(500, `${this.paymaster} has several ${what}`)
        }
        return first
    }
}

function send(response: ServerResponse, status: number, body: unknown): void {
    response.writeHead(status, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(body))
}
