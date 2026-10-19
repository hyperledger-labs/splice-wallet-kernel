// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi, describe, it, expect, beforeEach } from 'vitest'

import { AmuletService } from './amulet-service'
import { AmuletServiceScanOnly } from './amulet-service-scan'
import { AmuletServiceScanProxy } from './amulet-service-scan-proxy'
import { ScanClient, ScanProxyClient } from '@canton-network/core-splice-client'

vi.mock('./amulet-service-scan-proxy')
vi.mock('./amulet-service-scan')
/* oxlint-disable typescript/no-explicit-any */

const registryUrl = new URL('https://registry.example.com')

describe('AmuletService (Forwarding Layer)', () => {
    let mockTokenStandard: any
    let mockScanClient: any
    let mockScanProxyClient: any

    beforeEach(() => {
        mockTokenStandard = {}
        mockScanClient = Object.create(ScanClient.prototype)
        mockScanProxyClient = Object.create(ScanProxyClient.prototype)
    })

    describe('constructor should be build properly', () => {
        it('should instantiate AmuletServiceScanOnly when arg1 is a ScanClient', () => {
            new AmuletService(mockTokenStandard, mockScanClient)

            expect(AmuletServiceScanOnly).toHaveBeenCalledWith(
                mockTokenStandard,
                mockScanClient
            )
            expect(AmuletServiceScanProxy).not.toHaveBeenCalled()
        })

        it('should instantiate AmuletServiceScanProxy when arg1 is a ScanProxyClient', () => {
            new AmuletService(
                mockTokenStandard,
                mockScanProxyClient,
                mockScanClient
            )

            expect(AmuletServiceScanProxy).toHaveBeenCalledWith(
                mockTokenStandard,
                mockScanProxyClient,
                mockScanClient
            )
            expect(AmuletServiceScanOnly).not.toHaveBeenCalled()
        })
    })

    describe('methods should be forwarded to the service impl correctly', () => {
        let service: AmuletService
        let mockImplInstance: any

        beforeEach(() => {
            service = new AmuletService(mockTokenStandard, mockScanClient)

            const mockedClass = vi.mocked(AmuletServiceScanOnly)
            mockImplInstance = mockedClass.mock.instances[0]
        })

        it('should correctly forward buyMemberTraffic', async () => {
            const expectedResult = { success: true }
            mockImplInstance.buyMemberTraffic.mockResolvedValue(expectedResult)

            const result = await service.buyMemberTraffic(
                'alice::123',
                'bob::abc',
                1,
                'sync::123',
                'PAR::123',
                1
            )

            expect(mockImplInstance.buyMemberTraffic).toHaveBeenCalledWith(
                'alice::123',
                'bob::abc',
                1,
                'sync::123',
                'PAR::123',
                1
            )
            expect(result).toBe(expectedResult)
        })

        it('should correctly forward createTap', async () => {
            mockImplInstance.createTap.mockResolvedValue('tap-created')

            const result = await service.createTap(
                'receiver',
                '100',
                'admin',
                'id',
                registryUrl
            )

            expect(mockImplInstance.createTap).toHaveBeenCalledWith(
                'receiver',
                '100',
                'admin',
                'id',
                registryUrl
            )
            expect(result).toBe('tap-created')
        })

        it('should correctly forward cancelTransferPreapproval', async () => {
            mockImplInstance.cancelTransferPreapproval.mockResolvedValue(null)

            await service.cancelTransferPreapproval(
                'cid1',
                'tid1',
                'party::123'
            )

            expect(
                mockImplInstance.cancelTransferPreapproval
            ).toHaveBeenCalledWith('cid1', 'tid1', 'party::123')
        })

        it('should correctly forward getFeaturedAppsByParty', async () => {
            mockImplInstance.getFeaturedAppsByParty.mockResolvedValue(['app1'])

            const result = await service.getFeaturedAppsByParty('alice::123')

            expect(
                mockImplInstance.getFeaturedAppsByParty
            ).toHaveBeenCalledWith('alice::123')
            expect(result).toEqual(['app1'])
        })

        it('should correctly forward getTransferPreApprovalByParty', async () => {
            mockImplInstance.getTransferPreApprovalByParty.mockResolvedValue({
                status: 'approved',
            })

            const result =
                await service.getTransferPreApprovalByParty('alice::123')

            expect(
                mockImplInstance.getTransferPreApprovalByParty
            ).toHaveBeenCalledWith('alice::123')
            expect(result).toEqual({ status: 'approved' })
        })

        it('should correctly forward selfGrantFeatureAppRight', async () => {
            mockImplInstance.selfGrantFeatureAppRight.mockResolvedValue(true)

            const result = await service.selfGrantFeatureAppRight(
                'alice::123',
                'sync:123'
            )

            expect(
                mockImplInstance.selfGrantFeatureAppRight
            ).toHaveBeenCalledWith('alice::123', 'sync:123')
            expect(result).toBe(true)
        })

        it('should correctly forward cancelFeaturedAppRight', async () => {
            mockImplInstance.cancelFeaturedAppRight.mockResolvedValue(null)

            await service.cancelFeaturedAppRight('cid1', 'tid1')

            expect(
                mockImplInstance.cancelFeaturedAppRight
            ).toHaveBeenCalledWith('cid1', 'tid1')
        })

        it('should correctly forward isDevNet', async () => {
            mockImplInstance.isDevNet.mockResolvedValue(false)

            const result = await service.isDevNet()

            expect(mockImplInstance.isDevNet).toHaveBeenCalled()
            expect(result).toBe(false)
        })
    })
})
