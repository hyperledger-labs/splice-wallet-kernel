// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TokenStandardService } from '@canton-network/core-token-standard-service'
import type { AccessTokenProvider } from '@canton-network/core-wallet-auth'
import type { AbstractLedgerProvider } from '@canton-network/core-provider-ledger'
import { SDKErrorHandler } from '../../error/handler.js'
import { SDKLogger } from '../../logger/logger.js'
import type { SDKContext } from '../../init/types/context.js'
import { ParsedURL } from '../utils/url.js'
import { TrafficAccountNamespace } from './namespace.js'
import type { PurchaseTrafficParams } from './types.js'

const PAYMASTER_URL = 'https://paymaster.example'
const REGISTRY_URL = 'http://registry.example'
const DSO = 'DSO::1220deadbeef'
const BUYER = 'buyer::1220beef'
const PAYMASTER = 'paymaster::1220cafe'

/** `openapi-fetch` hands the custom fetch a `Request`, not a string. */
const urlOf = (input: unknown): string =>
    input instanceof Request ? input.url : String(input)

const blob = (contractId: string, createdEventBlob: string) => ({
    templateId: '#traffic-purchase-models:Tea.TrafficPurchase:X',
    contractId,
    createdEventBlob,
    synchronizerId: 'sync::1220',
})

const servedPurchaser = {
    trafficPurchaserId: '00served-purchaser',
    paymaster: PAYMASTER,
    paymasterReceiver: PAYMASTER,
    disclosedContracts: [blob('00served-purchaser', 'blob-purchaser')],
}

const servedRate = {
    conversionRateId: '00served-rate',
    instrumentId: { admin: DSO, id: 'Amulet' },
    conversionRate: '1048576.0',
    disclosedContracts: [blob('00served-rate', 'blob-rate')],
}

const factoryDisclosure = blob('00amulet-rules', 'blob-amulet-rules')

/**
 * A namespace wired to stubbed services.
 *
 * The error handler is a real `SDKErrorHandler` rather than a mock: a stubbed
 * `throw` returns instead of throwing, and execution would then run on past
 * every error site in `purchaseTraffic` into an unrelated `TypeError`.
 */
function makeNamespace() {
    const fetchTransferFactoryChoiceContext = vi.fn().mockResolvedValue({
        factoryId: '00factory',
        transferKind: 'direct',
        choiceContext: {
            choiceContextData: { values: { ctx: 'value' } },
            disclosedContracts: [factoryDisclosure],
        },
    })
    const getInputHoldingsCids = vi.fn().mockResolvedValue(['00holding'])
    const registriesToAssets = vi.fn().mockResolvedValue([
        {
            id: 'Amulet',
            displayName: 'Amulet',
            symbol: 'CC',
            registryUrl: REGISTRY_URL,
            admin: DSO,
            capabilities: {
                holding: [],
                transferInstruction: [],
                allocation: [],
                allocationInstruction: [],
                allocationRequest: [],
            },
        },
    ])

    const listContractsByInterface = vi.fn().mockResolvedValue([])

    const tokenStandardService = {
        registriesToAssets,
        transfer: { fetchTransferFactoryChoiceContext },
        core: { getInputHoldingsCids },
        listContractsByInterface,
    } as unknown as TokenStandardService

    const logger = new SDKLogger('console')
    const ctx: SDKContext = {
        ledgerProvider: {} as AbstractLedgerProvider,
        userId: 'test-user',
        logger,
        error: new SDKErrorHandler(logger),
        defaultSynchronizerId: 'sync::1220',
    }

    const traffic = new TrafficAccountNamespace(ctx, {
        tokenStandardService,
        registryUrls: [new ParsedURL(ctx, REGISTRY_URL)],
        paymasterAuth: {
            getAccessToken: vi.fn().mockResolvedValue(''),
            getAuthContext: vi.fn().mockResolvedValue(''),
        } as unknown as AccessTokenProvider,
    })

    return {
        traffic,
        registriesToAssets,
        getInputHoldingsCids,
        listContractsByInterface,
        fetchTransferFactoryChoiceContext,
    }
}

/** The params every case shares, minus the paymaster's half. */
const common = {
    purchaser: BUYER,
    instrumentId: 'Amulet',
    registryUrl: REGISTRY_URL,
    targetUser: { accountId: BUYER },
    requestId: 'request-1',
}

/** Everything a caller has to state when there is no paymaster to ask. */
const stated = {
    trafficPurchaserCid: '00stated-purchaser',
    conversionRateCid: '00stated-rate',
    paymasterReceiver: PAYMASTER,
}

describe('purchaseTraffic', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    /** Answers both paymaster endpoints, overridable per case. */
    const servePaymaster = (
        overrides: { purchaser?: unknown; rate?: unknown } = {},
        status = 200
    ) => {
        fetchMock.mockImplementation((input: RequestInfo | URL) => {
            const body = urlOf(input).includes('/traffic-purchaser')
                ? (overrides.purchaser ?? servedPurchaser)
                : (overrides.rate ?? servedRate)
            return Promise.resolve(
                new Response(JSON.stringify(body), {
                    status,
                    headers: { 'Content-Type': 'application/json' },
                })
            )
        })
    }

    beforeEach(() => {
        fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.clearAllMocks()
    })

    it('asks no paymaster when every term is stated', async () => {
        const { traffic } = makeNamespace()

        const [command, disclosures] = await traffic.purchaseTraffic({
            ...common,
            ...stated,
            trafficAmount: '2097152',
            conversionRate: '1048576',
            disclosedContracts: [blob('00stated-purchaser', 'blob-stated')],
        })

        expect(fetchMock).not.toHaveBeenCalled()
        expect(command.ExerciseCommand.contractId).toBe('00stated-purchaser')
        expect(command.ExerciseCommand.choiceArgument.conversionRateCid).toBe(
            '00stated-rate'
        )
        expect(disclosures.map((d) => d.contractId)).toEqual([
            '00stated-purchaser',
            '00amulet-rules',
        ])
    })

    it('takes the purchaser, the rate and the receiver off the paymaster', async () => {
        const { traffic, fetchTransferFactoryChoiceContext } = makeNamespace()
        servePaymaster()

        const [command] = await traffic.purchaseTraffic({
            ...common,
            paymasterApiUrl: PAYMASTER_URL,
            trafficAmount: '2097152',
        })

        expect(command.ExerciseCommand.contractId).toBe('00served-purchaser')
        expect(command.ExerciseCommand.choiceArgument.conversionRateCid).toBe(
            '00served-rate'
        )
        expect(
            fetchTransferFactoryChoiceContext.mock.calls[0]?.[1].transfer
                .receiver
        ).toBe(PAYMASTER)
    })

    it('keys the rate by the admin the token registry reported', async () => {
        const { traffic } = makeNamespace()
        servePaymaster()

        await traffic.purchaseTraffic({
            ...common,
            paymasterApiUrl: PAYMASTER_URL,
            trafficAmount: '2097152',
        })

        const rateCall = fetchMock.mock.calls.find((call) =>
            urlOf(call[0]).includes('/conversion-rates/')
        )
        const url = new URL(urlOf(rateCall?.[0]))
        expect(url.pathname).toBe(
            '/registry/traffic-purchase/v1/conversion-rates/Amulet'
        )
        expect(url.searchParams.get('admin')).toBe(DSO)
    })

    it('prices the purchase at the served rate', async () => {
        const { traffic, getInputHoldingsCids } = makeNamespace()
        servePaymaster()

        await traffic.purchaseTraffic({
            ...common,
            paymasterApiUrl: PAYMASTER_URL,
            // Two MiB at one MiB per unit, so exactly two units.
            trafficAmount: '2097152',
        })

        expect(getInputHoldingsCids.mock.calls[0]?.[0].amount.toString()).toBe(
            '2'
        )
    })

    it('lets a stated term win over the served one', async () => {
        const { traffic, fetchTransferFactoryChoiceContext } = makeNamespace()
        servePaymaster()

        const [command] = await traffic.purchaseTraffic({
            ...common,
            paymasterApiUrl: PAYMASTER_URL,
            trafficPurchaserCid: '00pinned-purchaser',
            conversionRateCid: '00pinned-rate',
            paymasterReceiver: 'someone-else::1220',
            trafficAmount: '2097152',
            conversionRate: '1048576',
        })

        expect(command.ExerciseCommand.contractId).toBe('00pinned-purchaser')
        expect(command.ExerciseCommand.choiceArgument.conversionRateCid).toBe(
            '00pinned-rate'
        )
        expect(
            fetchTransferFactoryChoiceContext.mock.calls[0]?.[1].transfer
                .receiver
        ).toBe('someone-else::1220')
    })

    it('refuses to price a pinned rate contract off a different served one', async () => {
        const { traffic } = makeNamespace()
        servePaymaster()

        await expect(
            traffic.purchaseTraffic({
                ...common,
                paymasterApiUrl: PAYMASTER_URL,
                conversionRateCid: '00pinned-rate',
                trafficAmount: '2097152',
            })
        ).rejects.toThrow(/Pass conversionRate as well/)
    })

    it('reports a paymaster that does not sell the instrument', async () => {
        const { traffic } = makeNamespace()
        fetchMock.mockImplementation((input: RequestInfo | URL) =>
            Promise.resolve(
                urlOf(input).includes('/traffic-purchaser')
                    ? new Response(JSON.stringify(servedPurchaser), {
                          status: 200,
                          headers: { 'Content-Type': 'application/json' },
                      })
                    : new Response(JSON.stringify({ error: 'no such rate' }), {
                          status: 404,
                          headers: { 'Content-Type': 'application/json' },
                      })
            )
        )

        await expect(
            traffic.purchaseTraffic({
                ...common,
                paymasterApiUrl: PAYMASTER_URL,
                trafficAmount: '2097152',
            })
        ).rejects.toThrow(/does not sell traffic for Amulet/)
    })

    it('reports a paymaster that has no purchaser set up', async () => {
        const { traffic } = makeNamespace()
        servePaymaster({}, 404)

        await expect(
            traffic.purchaseTraffic({
                ...common,
                paymasterApiUrl: PAYMASTER_URL,
                trafficAmount: '2097152',
            })
        ).rejects.toThrow(/is not set up to sell traffic/)
    })

    it('refuses a rate served for another instrument', async () => {
        const { traffic } = makeNamespace()
        servePaymaster({
            rate: {
                ...servedRate,
                instrumentId: { admin: DSO, id: 'SomethingElse' },
            },
        })

        await expect(
            traffic.purchaseTraffic({
                ...common,
                paymasterApiUrl: PAYMASTER_URL,
                trafficAmount: '2097152',
            })
        ).rejects.toThrow(/answered with a rate for SomethingElse/)
    })

    it('merges disclosures, letting a stated blob win a collision', async () => {
        const { traffic } = makeNamespace()
        servePaymaster()

        const [, disclosures] = await traffic.purchaseTraffic({
            ...common,
            paymasterApiUrl: PAYMASTER_URL,
            trafficAmount: '2097152',
            disclosedContracts: [blob('00served-rate', 'blob-i-already-held')],
        })

        expect(disclosures.map((d) => d.contractId)).toEqual([
            '00served-purchaser',
            '00served-rate',
            '00amulet-rules',
        ])
        expect(
            disclosures.find((d) => d.contractId === '00served-rate')
                ?.createdEventBlob
        ).toBe('blob-i-already-held')
    })

    it('never parses the rate when the holdings are spent in full', async () => {
        const {
            traffic,
            listContractsByInterface,
            fetchTransferFactoryChoiceContext,
        } = makeNamespace()
        servePaymaster({
            // Unparseable as a Daml Decimal. It is still never read here,
            // because spending in full costs whatever the holdings are worth
            // and no rate enters the calculation.
            rate: { ...servedRate, conversionRate: 'not-a-decimal' },
        })
        listContractsByInterface.mockResolvedValue([
            {
                contractId: '00holding',
                interfaceViewValue: {
                    amount: '3',
                    instrumentId: { admin: DSO, id: 'Amulet' },
                },
            },
        ])

        const [command] = await traffic.purchaseTraffic({
            ...common,
            paymasterApiUrl: PAYMASTER_URL,
        })

        expect(
            command.ExerciseCommand.choiceArgument.requestedTrafficAmount
        ).toBeNull()
        expect(
            fetchTransferFactoryChoiceContext.mock.calls[0]?.[1].transfer.amount
        ).toBe('3')
    })
})

/*
 * A compile-time witness that both arms of the union are inhabitable. Arm 2 is
 * what no runtime test above can prove typechecks the way a caller would write
 * it, and arm 1 is the shape every pre-existing call site uses.
 */
void ({
    ...common,
    ...stated,
    trafficAmount: '2097152',
    conversionRate: '1048576',
} satisfies PurchaseTrafficParams)

void ({
    ...common,
    paymasterApiUrl: PAYMASTER_URL,
    trafficAmount: '2097152',
} satisfies PurchaseTrafficParams)
