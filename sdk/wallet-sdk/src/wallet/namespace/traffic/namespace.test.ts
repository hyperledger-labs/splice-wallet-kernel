// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, beforeEach, expect } from 'vitest'
import { TrafficAccountNamespace } from './namespace'
import * as mock from '../../__tests__/mocks'
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * This is throw away type of test.
 * Inserted only to get some coverage for the traffic namespace.
 * It is replaced in a subsequent PR with a more complete integration test that actually tests
 * results not mocks.
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

    describe('unimplemented operations', () => {
        it('purchaseTraffic throws an unsupported error', async () => {
            await namespace.purchaseTraffic()

            expect(mock.ctx.error.throw).toHaveBeenCalledWith({
                message: 'traffic.purchaseTraffic is not implemented yet',
                type: 'SDKOperationUnsupported',
            })
        })

        it('setup throws an unsupported error', async () => {
            await namespace.setup()

            expect(mock.ctx.error.throw).toHaveBeenCalledWith({
                message: 'traffic.setup is not implemented yet',
                type: 'SDKOperationUnsupported',
            })
        })
    })
})
