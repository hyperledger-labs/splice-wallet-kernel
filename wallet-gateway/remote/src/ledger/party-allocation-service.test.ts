// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { pino } from 'pino'
import { Network } from '@canton-network/core-wallet-store'
import { sink } from 'pino-test'
import {
    AccessTokenProvider,
    AuthContext,
} from '@canton-network/core-wallet-auth'

type AsyncFn = () => Promise<unknown>

const { mockLedgerGet, mockLedgerPost, mockLedgerGrantUserRights } = vi.hoisted(
    () => ({
        mockLedgerGet: vi.fn<AsyncFn>(),
        mockLedgerPost: vi.fn<AsyncFn>(),
        mockLedgerGrantUserRights: vi.fn(),
    })
)

vi.mock('@canton-network/core-ledger-client', () => ({
    Signature: vi.fn(),
    SignatureFormat: vi.fn(),
    SigningAlgorithmSpec: vi.fn(),
    MultiTransactionSignatures: vi.fn(),
    SignedTopologyTransaction: vi.fn(),
    LedgerClient: vi.fn(function LedgerClientMock() {
        return {
            getWithRetry: mockLedgerGet,
            postWithRetry: mockLedgerPost,
            waitForPartyAndGrantUserRights: mockLedgerGrantUserRights,
            generateTopology: vi.fn<AsyncFn>().mockResolvedValue({
                partyId: 'party2::mypublickey',
                publicKeyFingerprint: 'mypublickey',
                topologyTransactions: ['tx1'],
                multiHash: 'combinedHash',
            }),
            allocateExternalParty: vi
                .fn<AsyncFn>()
                .mockResolvedValue({ partyId: 'party2::mypublickey' }),
        }
    }),
}))

describe('PartyAllocationService', () => {
    const network: Network & { synchronizerId: string } = {
        name: 'test',
        id: 'network-id',
        synchronizerId: 'sync-id',
        description: 'desc',
        identityProviderId: 'idp',
        ledgerApi: {
            baseUrl: 'http://ledger',
        },
        auth: {
            method: 'authorization_code',
            audience: 'aud',
            scope: 'scope',
            clientId: 'cid',
        },
        adminAuth: {
            method: 'client_credentials',
            audience: 'aud',
            scope: 'scope',
            clientId: 'cid',
            clientSecret: 'secret',
        },
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let service: any

    beforeEach(async () => {
        const mockLogger = pino(sink())
        const pas = await import('./party-allocation-service.js')

        // Mock AccessTokenProvider
        const mockAccessTokenProvider: AccessTokenProvider = {
            getAccessToken: vi
                .fn<() => Promise<string>>()
                .mockResolvedValue('admin.jwt'),
            getAuthContext: vi
                .fn<() => Promise<AuthContext>>()
                .mockResolvedValue({
                    userId: 'admin',
                    accessToken: 'admin.jwt',
                }),
        }

        service = new pas.PartyAllocationService({
            synchronizerId: network.synchronizerId,
            accessTokenProvider: mockAccessTokenProvider,
            httpLedgerUrl: network.ledgerApi.baseUrl,
            logger: mockLogger,
        })

        vi.spyOn(service, 'createFingerprintFromKey').mockReturnValue(
            'mypublickey'
        )
    })

    afterEach(() => vi.restoreAllMocks())

    it('allocates an internal party', async () => {
        mockLedgerGet.mockResolvedValueOnce({
            participantId: 'participant1::participantid',
        })
        mockLedgerPost.mockResolvedValueOnce({
            partyDetails: { party: 'party1::participantid' },
        })
        await expect(
            service.allocateParty('user1', 'party1')
        ).resolves.toStrictEqual({
            hint: 'party1',
            partyId: 'party1::participantid',
            namespace: 'participantid',
        })
    })

    it('allocates an external party', async () => {
        const publicKey = 'mypublickey'

        await expect(
            service.allocateParty(
                'user1',
                'party2',
                publicKey,
                async () => 'mysignedhash'
            )
        ).resolves.toStrictEqual({
            hint: 'party2',
            partyId: `party2::${publicKey}`,
            namespace: publicKey,
        })
    })
})
