// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi, describe, it, expect, beforeEach } from 'vitest'

import { AmuletService } from './amulet-service'

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('AmuletService', () => {
    const mockScanProxyClient = {
        get: vi.fn(),
    }
    const mockTokenStandard = {
        get: vi.fn(),
        core: {
            toQualifiedMemberId: vi.fn(),
        },
    }
    const mockScanClient = {
        get: vi.fn(),
    }

    let service: AmuletService

    beforeEach(() => {
        vi.clearAllMocks()

        service = new AmuletService(
            mockTokenStandard as any,
            mockScanProxyClient as any,
            mockScanClient as any
        )
    })

    it('should correctly call the scan proxy and return the transfer pre-approval', async () => {
        const mockResponse = {
            transfer_preapproval: { id: 'auth_123', status: 'approved' },
        }

        vi.mocked(mockScanProxyClient.get).mockResolvedValue(mockResponse)

        const result = await service.getTransferPreApprovalByParty('party-123')

        expect(mockScanProxyClient.get).toHaveBeenCalledWith(
            '/v0/scan-proxy/transfer-preapprovals/by-party/{party}',
            { path: { party: 'party-123' } }
        )
        expect(result).toEqual(mockResponse.transfer_preapproval)
    })

    it('should correctly call scan proxy and get featured apps by party', async () => {
        const mockResponse = {
            featured_app_right: {
                template_id:
                    '6c5802f86709a0ad4784af81f0bab40f3070b2f58128d8843da1e1784c147802:Splice.Amulet:FeaturedAppRight',
                contract_id:
                    '00eee8c6832ca5d8f0db72f9ab272749f0b68f6a85667734d6683badba0ad08bb3ca121220c31ac9ddba7e520ef4b4ceb22dd80fd8712835d830e2d5cb779972f940adff26',
                payload: {
                    dso: 'DSO::1220eba34d13ab223f1a933fbde4e760dff9a3a965031151b0918ca9739424406ded',
                    provider:
                        'app_user_localnet-localparty-1::1220a317b92f3c8d9deb01f107cb2e87ca4ff7c7b48afa1a8c6b614adaf40caea0fd',
                },
                created_event_blob:
                    'CgMyLjES4QQKRQDu6MaDLKXY8Nty+asnJ0nwto9qhWZ3NNZoO626CtCLs8oSEiDDGsndun5SDvS0zrIt2A/YcSg12DDi1ct3mXL5QK3/JhINc3BsaWNlLWFtdWxldBpkCkA2YzU4MDJmODY3MDlhMGFkNDc4NGFmODFmMGJhYjQwZjMwNzBiMmY1ODEyOGQ4ODQzZGExZTE3ODRjMTQ3ODAyEgZTcGxpY2USBkFtdWxldBoQRmVhdHVyZWRBcHBSaWdodCK8AWq5AQpNCks6SURTTzo6MTIyMGViYTM0ZDEzYWIyMjNmMWE5MzNmYmRlNGU3NjBkZmY5YTNhOTY1MDMxMTUxYjA5MThjYTk3Mzk0MjQ0MDZkZWQKaApmOmRhcHBfdXNlcl9sb2NhbG5ldC1sb2NhbHBhcnR5LTE6OjEyMjBhMzE3YjkyZjNjOGQ5ZGViMDFmMTA3Y2IyZTg3Y2E0ZmY3YzdiNDhhZmExYThjNmI2MTRhZGFmNDBjYWVhMGZkKklEU086OjEyMjBlYmEzNGQxM2FiMjIzZjFhOTMzZmJkZTRlNzYwZGZmOWEzYTk2NTAzMTE1MWIwOTE4Y2E5NzM5NDI0NDA2ZGVkMmRhcHBfdXNlcl9sb2NhbG5ldC1sb2NhbHBhcnR5LTE6OjEyMjBhMzE3YjkyZjNjOGQ5ZGViMDFmMTA3Y2IyZTg3Y2E0ZmY3YzdiNDhhZmExYThjNmI2MTRhZGFmNDBjYWVhMGZkObBCWR6GUAYAQioKJgokCAESILtrzNvaNAlL/f9efHCZuKhyJJGmO5Xg3gVIuebKI15aEB4=',
                created_at: '2026-04-28T14:33:45.269936Z',
            },
        }

        vi.mocked(mockScanProxyClient.get).mockResolvedValue(mockResponse)

        const result =
            await service.getFeaturedAppsByParty('featured-party-123')

        expect(mockScanProxyClient.get).toHaveBeenCalledWith(
            '/v0/scan-proxy/featured-apps/{provider_party_id}',
            { path: { provider_party_id: 'featured-party-123' } }
        )
        expect(result).toEqual(mockResponse.featured_app_right)
    })
    it('should correctly call the scan proxy and return the transfer pre-approval', async () => {
        const mockResponse = {
            transfer_preapproval: { id: 'auth_123', status: 'approved' },
        }

        vi.mocked(mockScanProxyClient.get).mockResolvedValue(mockResponse)

        const result = await service.getTransferPreApprovalByParty('party-123')

        expect(mockScanProxyClient.get).toHaveBeenCalledWith(
            '/v0/scan-proxy/transfer-preapprovals/by-party/{party}',
            { path: { party: 'party-123' } }
        )
        expect(result).toEqual(mockResponse.transfer_preapproval)
    })

    it('should correctly fetch the member traffic status', async () => {
        const mockResponse = {
            traffic_status: {
                actual: { total_consumed: 0, total_limit: 1600000 },
                target: { total_purchased: 1600000 },
            },
        }

        const domainId = 'fakeDomainId'
        const memberId = 'PAR::fakeparticipant'

        vi.mocked(mockScanClient.get).mockResolvedValue(mockResponse)
        vi.mocked(mockTokenStandard.core.toQualifiedMemberId).mockReturnValue(
            /^(PAR|MED)::/.test(memberId) ? memberId : `PAR::${memberId}`
        )

        await service.getMemberTrafficStatus(domainId, memberId)

        expect(mockScanClient.get).toHaveBeenCalledWith(
            '/v0/domains/{domain_id}/members/{member_id}/traffic-status',
            {
                path: {
                    domain_id: domainId,
                    member_id: memberId,
                },
            }
        )
    })
})
