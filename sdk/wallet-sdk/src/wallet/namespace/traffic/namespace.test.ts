// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, beforeEach, expect } from 'vitest'
import { TrafficAccountNamespace } from './namespace'
import * as mock from '../../__tests__/mocks'
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Simple test inserted only to get some coverage for the traffic namespace.
 *
 */
describe('TrafficAccountNamespace', () => {
    let namespace: TrafficAccountNamespace

    beforeEach(() => {
        vi.clearAllMocks()
        namespace = new TrafficAccountNamespace(mock.ctx)
    })

    describe('getTraffic', () => {
        it('requests the traffic account for the given id', async () => {
            const account = { accountId: 'acc-1', balance: 42 }
            mock.ledgerProvider.request.mockResolvedValueOnce(account)

            const result = await namespace.getTraffic('acc-1')

            expect(mock.ledgerProvider.request).toHaveBeenCalledWith({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/traffic/accounts/{account-id}',
                    requestMethod: 'get',
                    path: { 'account-id': 'acc-1' },
                },
            })
            expect(result).toBe(account)
        })
    })

    describe('topUpTraffic', () => {
        it('posts the balance delta and returns the response', async () => {
            const updated = { accountId: 'acc-1', balance: 100 }
            mock.ledgerProvider.request.mockResolvedValueOnce({
                response: updated,
            })

            const result = await namespace.topUpTraffic({
                accountId: 'acc-1',
                balanceDelta: 50,
                deduplicationId: 'dedup-1',
            } as any)

            expect(mock.ledgerProvider.request).toHaveBeenCalledWith({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/traffic/accounts',
                    requestMethod: 'post',
                    body: {
                        accountId: 'acc-1',
                        balanceDelta: 50,
                        deduplicationId: 'dedup-1',
                    },
                },
            })
            expect(result).toBe(updated)
        })

        it('generates a deduplicationId when none is provided', async () => {
            const randomUUID = vi
                .spyOn(crypto, 'randomUUID')
                .mockReturnValue(
                    'generated-uuid' as `${string}-${string}-${string}-${string}-${string}`
                )
            mock.ledgerProvider.request.mockResolvedValueOnce({ response: {} })

            await namespace.topUpTraffic({
                accountId: 'acc-1',
                balanceDelta: 10,
            } as any)

            expect(randomUUID).toHaveBeenCalled()
            expect(mock.ledgerProvider.request).toHaveBeenCalledWith(
                expect.objectContaining({
                    params: expect.objectContaining({
                        body: expect.objectContaining({
                            deduplicationId: 'generated-uuid',
                        }),
                    }),
                })
            )
        })
    })

    describe('purchaseTraffic', () => {
        // A registry stub that answers just enough for the purchase path: it
        // lists one asset, hands back a holding to spend, and settles the
        // payment as a one-step transfer.
        const purchaseCtx = () => {
            const tokenStandardService = {
                registriesToAssets: vi.fn().mockResolvedValue([
                    {
                        id: 'Amulet',
                        admin: 'dso::1',
                        registryUrl: 'http://example.com',
                    },
                ]),
                core: {
                    getInputHoldingsCids: vi
                        .fn()
                        .mockResolvedValue(['holding-1']),
                },
                transfer: {
                    fetchTransferFactoryChoiceContext: vi
                        .fn()
                        .mockResolvedValue({
                            factoryId: 'factory-1',
                            transferKind: 'transfer',
                            choiceContext: {
                                choiceContextData: { values: { k: 'v' } },
                                disclosedContracts: [],
                            },
                        }),
                },
            } as any
            return {
                tokenStandardService,
                registryUrls: [new (URL as any)('http://example.com')],
            }
        }

        const params = {
            purchaser: 'buyer::1',
            trafficPurchaserCid: 'tp-cid',
            conversionRateCid: 'cr-cid',
            paymasterReceiver: 'pm::1',
            instrumentId: 'Amulet',
            registryUrl: 'http://example.com',
            targetAccount: 'buyer::1',
            trafficAmount: '1048576',
            conversionRate: '1048576',
        } as any

        it('builds the PurchaseCredits exercise command', async () => {
            const extended = new TrafficAccountNamespace(
                mock.ctx,
                purchaseCtx() as any
            )

            const [command, disclosed] = await extended.purchaseTraffic(params)

            expect(command.ExerciseCommand.choice).toBe(
                'TrafficPurchaser_PurchaseCredits'
            )
            expect(command.ExerciseCommand.contractId).toBe('tp-cid')
            expect(command.ExerciseCommand.choiceArgument).toEqual(
                expect.objectContaining({
                    purchaser: 'buyer::1',
                    requestedTrafficAmount: '1048576',
                    transferFactoryCid: 'factory-1',
                })
            )
            expect(Array.isArray(disclosed)).toBe(true)
        })

        it('reports the operation as unsupported before sdk.extend', async () => {
            // Built from ctx alone, this instance has no registry to price
            // against, so the guard fires. The mocked error.throw does not
            // actually throw, so the body runs on and crashes on the missing
            // context; the catch swallows that, this only asserts the guard.
            try {
                await namespace.purchaseTraffic(params)
            } catch {
                // expected: no purchase context on this instance
            }

            expect(mock.ctx.error.throw).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'SDKOperationUnsupported' })
            )
        })
    })

    describe('setup', () => {
        it('throws an unsupported error', async () => {
            await namespace.setup()

            expect(mock.ctx.error.throw).toHaveBeenCalledWith({
                message: 'traffic.setup is not implemented yet',
                type: 'SDKOperationUnsupported',
            })
        })
    })
})
