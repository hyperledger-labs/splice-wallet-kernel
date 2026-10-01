// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * Imported from the module rather than through `./index.js`: the barrel also
 * re-exports `@daml.js/traffic-purchase-models-1.0.0`, which only exists once
 * `pnpm generate:traffic-purchase` has run, and these tests have no business
 * requiring Daml codegen on disk.
 */
import {
    TrafficPurchaseApiError,
    TrafficPurchaseClient,
} from './traffic-purchase-client.js'
import {
    createAccessTokenProvider,
    getRequestHeaders,
    getRequestUrl,
    jsonResponse,
    mockLogger,
} from './test-utils.js'

const BASE_URL = 'https://paymaster.example'
const DSO = 'DSO::1220deadbeef'

const purchaser = {
    trafficPurchaserId: '00purchaser',
    paymaster: 'paymaster::1220abcd',
    paymasterReceiver: 'paymaster::1220abcd',
    disclosedContracts: [
        {
            templateId:
                '#traffic-purchase-models:Tea.TrafficPurchase:TrafficPurchaser',
            contractId: '00purchaser',
            createdEventBlob: 'blob-purchaser',
            synchronizerId: 'sync::1220',
        },
    ],
}

const rate = {
    conversionRateId: '00rate',
    instrumentId: { admin: DSO, id: 'Amulet' },
    conversionRate: '1048576.0',
    disclosedContracts: [
        {
            templateId:
                '#traffic-purchase-models:Tea.TrafficPurchase:ConversionRate',
            contractId: '00rate',
            createdEventBlob: 'blob-rate',
            synchronizerId: 'sync::1220',
        },
    ],
}

describe('TrafficPurchaseClient', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    const client = () =>
        new TrafficPurchaseClient(
            BASE_URL,
            mockLogger,
            createAccessTokenProvider('a-token')
        )

    beforeEach(() => {
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.clearAllMocks()
    })

    it('reads the purchaser off the traffic-purchaser endpoint', async () => {
        fetchMock.mockResolvedValue(jsonResponse(purchaser))

        await expect(client().getTrafficPurchaser()).resolves.toEqual(purchaser)
        expect(getRequestUrl(fetchMock, '/traffic-purchaser')).toBe(
            `${BASE_URL}/registry/traffic-purchase/v1/traffic-purchaser`
        )
    })

    it('keys a rate by instrument id in the path and admin in the query', async () => {
        fetchMock.mockResolvedValue(jsonResponse(rate))

        await expect(
            client().getConversionRate({ admin: DSO, id: 'Amulet' })
        ).resolves.toEqual(rate)

        // The admin is a party id, so it carries `::` -- which has to be
        // escaped rather than sent raw.
        const url = new URL(getRequestUrl(fetchMock, '/conversion-rates/'))
        expect(url.pathname).toBe(
            '/registry/traffic-purchase/v1/conversion-rates/Amulet'
        )
        expect(url.searchParams.get('admin')).toBe(DSO)
        expect(url.search).not.toContain('::')
    })

    it('sends the access token as a bearer header', async () => {
        fetchMock.mockResolvedValue(jsonResponse(purchaser))

        await client().getTrafficPurchaser()

        expect(
            getRequestHeaders(fetchMock, '/traffic-purchaser')['authorization']
        ).toBe('Bearer a-token')
    })

    it('sends no authorization header when there is no token', async () => {
        fetchMock.mockResolvedValue(jsonResponse(purchaser))

        await new TrafficPurchaseClient(
            BASE_URL,
            mockLogger,
            createAccessTokenProvider('')
        ).getTrafficPurchaser()

        expect(
            getRequestHeaders(fetchMock, '/traffic-purchaser')
        ).not.toHaveProperty('authorization')
    })

    it('reports a 404 with the status and the error body', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({ error: 'no rate for Amulet' }, 404)
        )

        const failure = await client()
            .getConversionRate({ admin: DSO, id: 'Amulet' })
            .catch((error: unknown) => error)

        expect(failure).toBeInstanceOf(TrafficPurchaseApiError)
        const apiError = failure as TrafficPurchaseApiError
        expect(apiError.status).toBe(404)
        expect(apiError.body).toEqual({ error: 'no rate for Amulet' })
        expect(apiError.message).toContain(BASE_URL)
    })

    it('reports a 500 the same way, so a caller can tell it from a 404', async () => {
        fetchMock.mockResolvedValue(jsonResponse({ error: 'boom' }, 500))

        const failure = await client()
            .getTrafficPurchaser()
            .catch((error: unknown) => error)

        expect(failure).toBeInstanceOf(TrafficPurchaseApiError)
        expect((failure as TrafficPurchaseApiError).status).toBe(500)
    })
})
