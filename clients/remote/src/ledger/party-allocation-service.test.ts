// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { jest } from '@jest/globals'
import { pino } from 'pino'
import { Network } from '@canton-network/core-wallet-store'
import { sink } from 'pino-test'

type AsyncFn = () => Promise<unknown>

const mockLedgerGet = jest.fn<AsyncFn>()
const mockLedgerPost = jest.fn<AsyncFn>()
const mockLedgerGrantUserRights = jest.fn()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockTopologyWriteService: jest.MockedClass<any> = jest
    .fn()
    .mockImplementation(() => ({
        generateTransactions: jest.fn<AsyncFn>().mockResolvedValue({
            generatedTransactions: [],
        }),
        generateTopology: jest.fn<AsyncFn>().mockResolvedValue({
            partyId: 'party2::mypublickey',
            publicKeyFingerprint: 'mypublickey',
            topologyTransactions: ['tx1'],
            multiHash: 'combinedHash',
        }),
        addTransactions: jest.fn<AsyncFn>(),
        authorizePartyToParticipant: jest.fn<AsyncFn>(),
        allocateExternalParty: jest
            .fn<AsyncFn>()
            .mockResolvedValue({ partyId: 'party2::mypublickey' }),
    }))

// Add static method to the mock class
MockTopologyWriteService.createFingerprintFromKey = jest
    .fn()
    .mockReturnValue('mypublickey')
MockTopologyWriteService.combineHashes = jest
    .fn()
    .mockReturnValue('combinedhash')

jest.unstable_mockModule('@canton-network/core-ledger-client', () => ({
    Signature: jest.fn(),
    SignatureFormat: jest.fn(),
    SigningAlgorithmSpec: jest.fn(),
    MultiTransactionSignatures: jest.fn(),
    SignedTopologyTransaction: jest.fn(),
    LedgerClient: jest.fn().mockImplementation(() => {
        return {
            get: mockLedgerGet,
            post: mockLedgerPost,
            grantUserRights: mockLedgerGrantUserRights,
        }
    }),
    TopologyWriteService: MockTopologyWriteService,
}))

describe('PartyAllocationService', () => {
    const network: Network = {
        name: 'test',
        chainId: 'chain-id',
        synchronizerId: 'sync-id',
        description: 'desc',
        ledgerApi: {
            baseUrl: 'http://ledger',
            adminGrpcUrl: 'http://ledger/admin',
        },
        auth: {
            identityProviderId: 'idp',
            type: 'implicit',
            issuer: 'http://idp',
            configUrl: 'http://idp/.well-known/openid-configuration',
            audience: 'aud',
            scope: 'scope',
            clientId: 'cid',
            admin: { clientId: 'cid', clientSecret: 'secret' },
        },
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let service: any

    beforeEach(async () => {
        const mockLogger = pino(sink())
        const pas = await import('./party-allocation-service.js')

        service = new pas.PartyAllocationService(
            network.synchronizerId,
            'admin.jwt',
            network.ledgerApi.baseUrl,
            mockLogger
        )
    })

    it('allocates an internal party', async () => {
        mockLedgerGet.mockResolvedValueOnce({ participantId: 'participantid' })
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
