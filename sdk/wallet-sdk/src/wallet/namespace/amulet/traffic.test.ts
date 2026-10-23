// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, beforeEach, expect } from 'vitest'
import { TrafficNamespace } from './traffic'
import { type AmuletNamespaceConfig, fetchAmulet } from './namespace'
import * as mock from '../../__tests__/mocks'
/* oxlint-disable typescript/no-explicit-any */

vi.mock('./namespace.js', () => ({
    fetchAmulet: vi.fn(),
}))

describe('TrafficNamespace', () => {
    let trafficNamespace: TrafficNamespace
    let config: AmuletNamespaceConfig

    beforeEach(() => {
        config = {
            commonCtx: {
                ...mock.ctx,
                defaultSynchronizerId: 'SYNCDEFAULT::123',
            } as any,
            amuletService: {
                getMemberTrafficStatus: vi.fn(),
                buyMemberTraffic: vi.fn(),
            },
        } as unknown as AmuletNamespaceConfig

        trafficNamespace = new TrafficNamespace(config)
    })

    describe('status', () => {
        it('should get traffic status when memberId and syncId are specified ', async () => {
            vi.mocked(
                config.amuletService.getMemberTrafficStatus
            ).mockResolvedValue({
                traffic_status: {
                    actual: { total_consumed: 0, total_limit: 1200000 },
                    target: { total_purchased: 1200000 },
                },
            })

            const result = await trafficNamespace.status({
                memberId: 'PAR::123',
                synchronizerId: 'SYNC::123',
            })

            expect(mock.ledgerProvider.request).not.toHaveBeenCalled()
            expect(
                config.amuletService.getMemberTrafficStatus
            ).toHaveBeenCalledWith('SYNC::123', 'PAR::123')
            expect(result).toStrictEqual({
                traffic_status: {
                    actual: { total_consumed: 0, total_limit: 1200000 },
                    target: { total_purchased: 1200000 },
                },
            })
        })

        it('should fetch defaults if synchronizer/memberId id is not specified', async () => {
            vi.mocked(
                config.amuletService.getMemberTrafficStatus
            ).mockResolvedValue({
                traffic_status: {
                    actual: { total_consumed: 0, total_limit: 1200000 },
                    target: { total_purchased: 1200000 },
                },
            })

            mock.ledgerProvider.request.mockResolvedValueOnce({
                participantId: 'PAR::234',
            })

            const result = await trafficNamespace.status()

            expect(mock.ledgerProvider.request).toHaveBeenCalledWith({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/parties/participant-id',
                    requestMethod: 'get',
                },
            })
            expect(
                config.amuletService.getMemberTrafficStatus
            ).toHaveBeenCalledWith('SYNCDEFAULT::123', 'PAR::234')
            expect(result).toStrictEqual({
                traffic_status: {
                    actual: { total_consumed: 0, total_limit: 1200000 },
                    target: { total_purchased: 1200000 },
                },
            })
        })
    })

    describe('buy', () => {
        const buyer = 'alice::123'
        const utxos = ['utxo-cid-1']

        it('complete buy member traffic', async () => {
            vi.mocked(fetchAmulet).mockResolvedValue({
                admin: 'DSO::123',
            } as any)

            const buyTrafficCommand = {
                choice: 'BuyTraffic',
                templateId: 'AmuletTraffic',
            }
            const dc = ['dc-1']
            vi.mocked(config.amuletService.buyMemberTraffic).mockResolvedValue([
                buyTrafficCommand as any,
                dc as any,
            ])

            const result = await trafficNamespace.buy({
                buyer: buyer,
                ccAmount: 500,
                inputUtxos: utxos,
                migrationId: 2,
                memberId: 'PAR::123',
                synchronizerId: 'SYNC::123',
            })

            expect(fetchAmulet).toHaveBeenCalledWith(config)
            expect(mock.ledgerProvider.request).not.toHaveBeenCalled()
            expect(config.amuletService.buyMemberTraffic).toHaveBeenCalledWith(
                'DSO::123',
                buyer,
                500,
                'SYNC::123',
                'PAR::123',
                2,
                utxos
            )

            expect(result).toStrictEqual([
                { ExerciseCommand: buyTrafficCommand },
                dc,
            ])
        })

        it('by member traffic with defaults params if not provided', async () => {
            vi.mocked(fetchAmulet).mockResolvedValue({
                admin: 'DSO::123',
            } as any)
            vi.mocked(config.amuletService.buyMemberTraffic).mockResolvedValue([
                'cmd' as any,
                [],
            ])

            mock.ledgerProvider.request.mockResolvedValueOnce({
                participantId: 'PAR::234',
            })

            await trafficNamespace.buy({
                buyer: buyer,
                ccAmount: 125,
                inputUtxos: utxos,
            })

            expect(mock.ledgerProvider.request).toHaveBeenCalledTimes(1)
            expect(config.amuletService.buyMemberTraffic).toHaveBeenCalledWith(
                'DSO::123',
                buyer,
                125,
                'SYNCDEFAULT::123',
                'PAR::234',
                0,
                utxos
            )
        })
    })
})
