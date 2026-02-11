// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { jest } from '@jest/globals'
import { pino } from 'pino'
import { Network } from '@canton-network/core-wallet-store'
import { sink } from 'pino-test'
import { AccessTokenProvider } from '@canton-network/core-wallet-auth'

type AsyncFn = () => Promise<unknown>

const mockLedgerGet = jest.fn<AsyncFn>()
const mockLedgerPost = jest.fn<AsyncFn>()
const mockLedgerGrantUserRights = jest.fn()
const mockWaitForPartyToExist = jest.fn<AsyncFn>()

jest.unstable_mockModule('@canton-network/core-ledger-client', () => ({
    Signature: jest.fn(),
    SignatureFormat: jest.fn(),
    SigningAlgorithmSpec: jest.fn(),
    MultiTransactionSignatures: jest.fn(),
    SignedTopologyTransaction: jest.fn(),
    defaultRetryableOptions: {},
    LedgerClient: jest.fn().mockImplementation(() => {
        return {
            getWithRetry: mockLedgerGet,
            postWithRetry: mockLedgerPost,
            waitForPartyAndGrantUserRights: mockLedgerGrantUserRights,
            waitForPartyToExist: mockWaitForPartyToExist,
            generateTopology: jest.fn<AsyncFn>().mockResolvedValue({
                partyId: 'party2::mypublickey',
                publicKeyFingerprint: 'mypublickey',
                topologyTransactions: ['tx1'],
                multiHash: 'combinedHash',
            }),
            allocateExternalParty: jest
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
            getUserAccessToken: jest
                .fn<() => Promise<string>>()
                .mockResolvedValue('user.jwt'),
            getAdminAccessToken: jest
                .fn<() => Promise<string>>()
                .mockResolvedValue('admin.jwt'),
        }

        service = new pas.PartyAllocationService({
            synchronizerId: network.synchronizerId,
            accessTokenProvider: mockAccessTokenProvider,
            httpLedgerUrl: network.ledgerApi.baseUrl,
            logger: mockLogger,
        })

        jest.spyOn(service, 'createFingerprintFromKey').mockReturnValue(
            'mypublickey'
        )
    })

    afterEach(() => jest.restoreAllMocks())

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

        // Mock /v2/users/{user-id}/rights for hasCanExecuteAsAnyPartyRights
        mockLedgerGet.mockResolvedValueOnce({ rights: [] })

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

    it('internal party, no wildcard rights - grants user rights', async () => {
        mockLedgerGet.mockResolvedValueOnce({
            participantId: 'participant1::participantid',
        })
        mockLedgerPost.mockResolvedValueOnce({
            partyDetails: { party: 'party1::participantid' },
        })
        const result = await service.allocateParty('user1', 'party1')

        expect(result).toStrictEqual({
            hint: 'party1',
            partyId: 'party1::participantid',
            namespace: 'participantid',
        })
        expect(mockLedgerGrantUserRights).toHaveBeenCalledWith(
            'user1',
            'party1::participantid'
        )
        expect(mockWaitForPartyToExist).not.toHaveBeenCalled()
    })

    it('internal party, with wildcard rights - grants user rights', async () => {
        mockLedgerGet.mockResolvedValueOnce({
            participantId: 'participant1::participantid',
        })
        mockLedgerPost.mockResolvedValueOnce({
            partyDetails: { party: 'party1::participantid' },
        })
        const result = await service.allocateParty('user1', 'party1')

        expect(result).toStrictEqual({
            hint: 'party1',
            partyId: 'party1::participantid',
            namespace: 'participantid',
        })
        // Internal always grants (needs per-party rights)
        expect(mockLedgerGrantUserRights).toHaveBeenCalledWith(
            'user1',
            'party1::participantid'
        )
    })

    it('external party, no wildcard rights - grants user rights', async () => {
        const publicKey = 'mypublickey'

        mockLedgerGet.mockResolvedValueOnce({
            rights: [],
        })

        const result = await service.allocateParty(
            'user1',
            'party2',
            publicKey,
            async () => 'mysignedhash'
        )

        expect(result).toStrictEqual({
            hint: 'party2',
            partyId: 'party2::mypublickey',
            namespace: publicKey,
        })
        expect(mockLedgerGrantUserRights).toHaveBeenCalledWith(
            'user1',
            'party2::mypublickey'
        )
    })

    it('external party, with wildcard rights - omits granting user rights', async () => {
        const publicKey = 'mypublickey'

        mockLedgerGet.mockResolvedValueOnce({
            rights: [
                {
                    kind: {
                        CanExecuteAsAnyParty: { value: {} },
                    },
                },
            ],
        })
        mockWaitForPartyToExist.mockResolvedValueOnce(undefined)

        const result = await service.allocateParty(
            'user1',
            'party2',
            publicKey,
            async () => 'mysignedhash'
        )

        expect(result).toStrictEqual({
            hint: 'party2',
            partyId: 'party2::mypublickey',
            namespace: publicKey,
        })
        expect(mockLedgerGrantUserRights).not.toHaveBeenCalled()
        expect(mockWaitForPartyToExist).toHaveBeenCalledWith(
            'party2::mypublickey'
        )
    })
})
