// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as mock from '../../__tests__/mocks'
import { it, describe, beforeEach, vi, expect } from 'vitest'
import {
    PartyNamespace,
    PreparedPartyCreationService,
    SignedPartyCreationService,
} from '.'
import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'
import { signTransactionHash } from '@canton-network/core-signing-lib'

const { ctx, ledgerProvider } = mock

vi.mock('@canton-network/core-provider-ledger', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-provider-ledger')
        >()
    return {
        ...actual,
        LedgerProvider: vi.fn(
            class {
                request = ledgerProvider.request
            }
        ),
    }
})

vi.mock('@canton-network/core-signing-lib', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-signing-lib')
        >()
    return {
        ...actual,
        signTransactionHash: vi.fn().mockReturnValue('hash'),
    }
})

describe('Party namespace', () => {
    let party: PartyNamespace

    beforeEach(() => {
        party = new PartyNamespace(ctx)
    })

    describe('list', () => {
        it('should properly list all parties with specific access', async () => {
            // Mock list user rights response
            ledgerProvider.request.mockResolvedValueOnce({
                rights: [
                    {
                        kind: {
                            CanActAs: {
                                value: {
                                    party: 'some-party',
                                },
                            },
                        },
                    },
                    {
                        kind: {
                            CanExecuteAs: {
                                value: {
                                    party: 'some-other-party',
                                },
                            },
                        },
                    },
                    {
                        kind: {
                            CanReadAs: {
                                value: {
                                    party: 'some-other-party2',
                                },
                            },
                        },
                    },
                ],
            } satisfies LedgerCommonSchemas['ListUserRightsResponse'])

            const list = await party.list()

            expect(ledgerProvider.request).toHaveBeenCalledExactlyOnceWith({
                method: 'ledgerApi',
                params: {
                    requestMethod: 'get',
                    resource: '/v2/users/{user-id}/rights',
                    path: { 'user-id': ctx.userId },
                },
            })

            expect(list).toEqual([
                'some-party',
                'some-other-party',
                'some-other-party2',
            ])
        })

        it('should return all local parties if user has admin rights', async () => {
            // Mock list user rights response (admin rights)
            ledgerProvider.request
                .mockResolvedValueOnce({
                    rights: [
                        {
                            kind: {
                                CanReadAsAnyParty: {
                                    value: {},
                                },
                            },
                        },
                    ],
                } satisfies LedgerCommonSchemas['ListUserRightsResponse'])
                // Mock list known parties response
                .mockResolvedValueOnce({
                    partyDetails: [
                        {
                            party: 'party1',
                        },
                        {
                            party: 'party2',
                            isLocal: true,
                        },
                    ],
                } satisfies LedgerCommonSchemas['ListKnownPartiesResponse'])

            const list = await party.list()

            expect(ledgerProvider.request).toHaveBeenCalledTimes(2)
            expect(ledgerProvider.request).toHaveBeenNthCalledWith(1, {
                method: 'ledgerApi',
                params: {
                    requestMethod: 'get',
                    resource: '/v2/users/{user-id}/rights',
                    path: { 'user-id': ctx.userId },
                },
            })
            expect(ledgerProvider.request).toHaveBeenNthCalledWith(2, {
                method: 'ledgerApi',
                params: {
                    requestMethod: 'get',
                    resource: '/v2/parties',
                    query: {},
                },
            })

            expect(list).toEqual(['party2'])
        })
    })

    describe('internal', () => {
        it('should properly check for existing internal party', async () => {
            const partyId = 'partyHint::partyFingerprint'

            // Mock get participant ID
            ledgerProvider.request
                .mockResolvedValueOnce({
                    participantId: 'unusedPart::partyFingerprint',
                } satisfies LedgerCommonSchemas['GetParticipantIdResponse'])
                // Mock get party details (party exists)
                .mockResolvedValueOnce({
                    partyDetails: [
                        {
                            party: partyId,
                            isLocal: true,
                        },
                    ],
                } satisfies LedgerCommonSchemas['GetPartiesResponse'])

            const result = await party.internal.allocate({
                partyHint: 'partyHint',
                synchronizerId: 'syncId',
                userId: 'userId',
            })

            expect(ledgerProvider.request).toHaveBeenNthCalledWith(1, {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/parties/participant-id',
                    requestMethod: 'get',
                },
            })
            expect(ledgerProvider.request).toHaveBeenNthCalledWith(2, {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/parties/{party}',
                    requestMethod: 'get',
                    path: {
                        party: partyId,
                    },
                    query: {
                        'identity-provider-id': '',
                        parties: [partyId],
                    },
                },
            })

            expect(result).toBe(partyId)
        })

        it('should create an allocated party when not existing yet', async () => {
            // Mock get participant ID
            ledgerProvider.request
                .mockResolvedValueOnce({
                    participantId: '',
                } satisfies LedgerCommonSchemas['GetParticipantIdResponse'])
                // Mock get party details (party doesn't exist)
                .mockResolvedValueOnce({
                    partyDetails: [],
                } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                // Mock allocate internal party
                .mockResolvedValueOnce({
                    partyDetails: {
                        party: 'allocated_party',
                    },
                })

            const result = await party.internal.allocate({
                partyHint: 'partyHint',
                synchronizerId: 'syncId',
                userId: 'userId',
            })

            expect(ledgerProvider.request).toHaveBeenNthCalledWith(1, {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/parties/participant-id',
                    requestMethod: 'get',
                },
            })
            expect(ledgerProvider.request).toHaveBeenNthCalledWith(2, {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/parties/{party}',
                    requestMethod: 'get',
                    path: {
                        party: 'partyHint::',
                    },
                    query: {
                        'identity-provider-id': '',
                        parties: ['partyHint::'],
                    },
                },
            })
            expect(ledgerProvider.request).toHaveBeenNthCalledWith(3, {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/parties',
                    requestMethod: 'post',
                    body: {
                        partyIdHint: 'partyHint',
                        identityProviderId: '',
                        synchronizerId: 'syncId',
                        userId: 'userId',
                    },
                },
            })

            expect(result).toBe('allocated_party')
        })
    })

    describe('external', () => {
        let preparedParty: PreparedPartyCreationService
        let signedParty: SignedPartyCreationService
        let signTransactionHashSpy: ReturnType<
            typeof vi.mocked<typeof signTransactionHash>
        >

        const partyTransaction = {
            partyId: 'partyId',
            publicKeyFingerprint: 'fingerprint',
            topologyTransactions: ['tx1', 'tx2'],
            multiHash: 'multiHash',
        }

        beforeEach(() => {
            vi.restoreAllMocks()

            signTransactionHashSpy = vi
                .mocked(signTransactionHash)
                .mockReturnValue('signature')

            preparedParty = new PreparedPartyCreationService(
                ctx,
                Promise.resolve(partyTransaction)
            )
            signedParty = new SignedPartyCreationService(
                ctx,
                Promise.resolve({
                    party: partyTransaction,
                    signature: 'defaultSignature',
                })
            )
        })

        describe('external.create', () => {
            it('should generate a topology based on options and return a prepared party service instance', async () => {
                // Mock generate external party topology
                ledgerProvider.request.mockResolvedValueOnce({
                    partyId: 'partyId',
                    publicKeyFingerprint: 'string',
                    topologyTransactions: [],
                    multiHash: 'hash',
                } satisfies LedgerCommonSchemas['GenerateExternalPartyTopologyResponse'])

                const partyCreationService = party.external.create(
                    'publicKey',
                    {
                        partyHint: 'partyHint',
                        synchronizerId: 'syncId',
                    }
                )

                expect(partyCreationService).toBeInstanceOf(
                    PreparedPartyCreationService
                )

                await partyCreationService.topology()

                expect(ledgerProvider.request).toHaveBeenCalledWith({
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/parties/external/generate-topology',
                        body: {
                            synchronizer: 'syncId',
                            partyHint: 'partyHint',
                            publicKey: {
                                format: 'CRYPTO_KEY_FORMAT_RAW',
                                keyData: 'publicKey',
                                keySpec: 'SIGNING_KEY_SPEC_EC_CURVE25519',
                            },
                            localParticipantObservationOnly: false,
                            confirmationThreshold: 1,
                            otherConfirmingParticipantUids: [],
                            observingParticipantUids: [],
                        },
                        requestMethod: 'post',
                    },
                })
            })

            it('should call participant-id endpoint depending on options', () => {
                const observingParticipantEndpoints = Array(3).fill({
                    url: new URL('http://example.com'),
                    tokenProviderConfig: {
                        method: 'static',
                        token: '',
                    },
                })

                const confirmingParticipantEndpoints = Array(2).fill({
                    url: new URL('http://example.com'),
                    tokenProviderConfig: {
                        method: 'static',
                        token: '',
                    },
                })

                // Mock get participant ID for each endpoint (5 endpoints)
                ;[
                    ...observingParticipantEndpoints,
                    ...confirmingParticipantEndpoints,
                ].forEach(() => {
                    ledgerProvider.request.mockResolvedValueOnce({
                        participantId: 'participantId',
                    })
                })

                party.external.create('publicKey', {
                    observingParticipantEndpoints,
                    confirmingParticipantEndpoints,
                })
                ;[
                    ...observingParticipantEndpoints,
                    ...confirmingParticipantEndpoints,
                ].forEach((_, idx) => {
                    expect(ledgerProvider.request).toHaveBeenNthCalledWith(
                        idx + 1,
                        {
                            method: 'ledgerApi',
                            params: {
                                resource: '/v2/parties/participant-id',
                                requestMethod: 'get',
                            },
                        }
                    )
                })
            })
        })

        describe('external.create.sign', () => {
            it('should sign the prepared party with a signature', async () => {
                const result = preparedParty.sign('privateKey')

                expect(result).toBeInstanceOf(SignedPartyCreationService)

                // Signing happens once the prepared transaction resolves.
                await vi.waitFor(() =>
                    expect(
                        signTransactionHashSpy
                    ).toHaveBeenCalledExactlyOnceWith(
                        partyTransaction.multiHash,
                        'privateKey'
                    )
                )
            })
        })

        describe('external.create.execute', () => {
            it('should be able to execute party creating with offline signature', async () => {
                const mockPartyResponse = {
                    partyId: 'partyId',
                    publicKeyFingerprint: 'fingerprint',
                    topologyTransactions: ['tx1', 'tx2'],
                    multiHash: 'multiHash',
                }

                const executeSpy = vi
                    .spyOn(SignedPartyCreationService.prototype, 'execute')
                    .mockResolvedValue(mockPartyResponse)

                const result = await preparedParty.execute('signature', {
                    expectHeavyLoad: true,
                    grantUserRights: true,
                })

                expect(executeSpy).toHaveBeenCalledExactlyOnceWith({
                    expectHeavyLoad: true,
                    grantUserRights: true,
                })
                expect(result).toEqual(mockPartyResponse)
            })
        })

        describe('external.create.topology', () => {
            it('should return party transaction topology properly', async () => {
                expect(await preparedParty.topology()).toEqual(partyTransaction)
            })
        })

        describe('external.create.sign.execute', () => {
            it('should return the party if it is already existing', async () => {
                // Mock checkIfPartyExists - party already exists
                ledgerProvider.request.mockResolvedValueOnce({
                    partyDetails: [
                        {
                            party: partyTransaction.partyId,
                        },
                    ],
                } satisfies LedgerCommonSchemas['GetPartiesResponse'])

                const result = await signedParty.execute()

                expect(ledgerProvider.request).toHaveBeenNthCalledWith(1, {
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/parties/{party}',
                        requestMethod: 'get',
                        path: { party: partyTransaction.partyId },
                        query: {},
                    },
                })

                expect(result).toEqual(partyTransaction)
            })

            it('should execute a new party into the ledger', async () => {
                // Mock checkIfPartyExists - party doesn't exist yet
                ledgerProvider.request
                    .mockResolvedValueOnce({
                        partyDetails: [],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock allocate call
                    .mockResolvedValueOnce({
                        partyId: 'partyId',
                    } satisfies LedgerCommonSchemas['AllocateExternalPartyResponse'])
                    // Mock checkIfPartyExists in polling loop - party now exists
                    .mockResolvedValueOnce({
                        partyDetails: [
                            {
                                party: partyTransaction.partyId,
                            },
                        ],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock grantRights call
                    .mockResolvedValueOnce({
                        newlyGrantedRights: [{}],
                    } satisfies LedgerCommonSchemas['GrantUserRightsResponse'])

                const result = await signedParty.execute()

                expect(ledgerProvider.request).toHaveBeenNthCalledWith(2, {
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/parties/external/allocate',
                        requestMethod: 'post',
                        body: {
                            synchronizer: ctx.defaultSynchronizerId,
                            identityProviderId: '',
                            onboardingTransactions:
                                partyTransaction.topologyTransactions.map(
                                    (transaction) => ({
                                        transaction,
                                    })
                                ),
                            multiHashSignatures: [
                                {
                                    format: 'SIGNATURE_FORMAT_CONCAT',
                                    signature: 'defaultSignature',
                                    signedBy:
                                        partyTransaction.publicKeyFingerprint,
                                    signingAlgorithmSpec:
                                        'SIGNING_ALGORITHM_SPEC_ED25519',
                                },
                            ],
                        },
                    },
                })

                expect(result).toEqual(partyTransaction)
            })

            it('should execute without granting user rights when grantUserRights is false', async () => {
                // Mock checkIfPartyExists - party doesn't exist yet
                ledgerProvider.request
                    .mockResolvedValueOnce({
                        partyDetails: [],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock allocate call
                    .mockResolvedValueOnce({
                        partyId: 'partyId',
                    } satisfies LedgerCommonSchemas['AllocateExternalPartyResponse'])

                const result = await signedParty.execute({
                    grantUserRights: false,
                })

                expect(ledgerProvider.request).toHaveBeenCalledTimes(2)
                expect(ledgerProvider.request).toHaveBeenNthCalledWith(2, {
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/parties/external/allocate',
                        requestMethod: 'post',
                        body: {
                            synchronizer: ctx.defaultSynchronizerId,
                            identityProviderId: '',
                            onboardingTransactions:
                                partyTransaction.topologyTransactions.map(
                                    (transaction) => ({
                                        transaction,
                                    })
                                ),
                            multiHashSignatures: [
                                {
                                    format: 'SIGNATURE_FORMAT_CONCAT',
                                    signature: 'defaultSignature',
                                    signedBy:
                                        partyTransaction.publicKeyFingerprint,
                                    signingAlgorithmSpec:
                                        'SIGNING_ALGORITHM_SPEC_ED25519',
                                },
                            ],
                        },
                    },
                })
                expect(result).toEqual(partyTransaction)
            })

            it('should poll multiple times before party exists and then grant rights', async () => {
                vi.useFakeTimers()

                // Mock checkIfPartyExists - party doesn't exist yet
                ledgerProvider.request
                    .mockResolvedValueOnce({
                        partyDetails: [],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock allocate call
                    .mockResolvedValueOnce({
                        partyId: 'partyId',
                    } satisfies LedgerCommonSchemas['AllocateExternalPartyResponse'])
                    // Mock checkIfPartyExists polling - party doesn't exist (1st try)
                    .mockResolvedValueOnce({
                        partyDetails: [],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock checkIfPartyExists polling - party doesn't exist (2nd try)
                    .mockResolvedValueOnce({
                        partyDetails: [],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock checkIfPartyExists polling - party now exists (3rd try)
                    .mockResolvedValueOnce({
                        partyDetails: [
                            {
                                party: partyTransaction.partyId,
                            },
                        ],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock grantRights call
                    .mockResolvedValueOnce({
                        newlyGrantedRights: [{}],
                    } satisfies LedgerCommonSchemas['GrantUserRightsResponse'])

                const resultPromise = signedParty.execute()
                await vi.runAllTimersAsync()
                const result = await resultPromise

                // Should have been called 6 times total (1 initial check + 1 allocate + 3 polling + 1 grant)
                expect(ledgerProvider.request).toHaveBeenCalledTimes(6)
                expect(result).toEqual(partyTransaction)

                vi.useRealTimers()
            })

            it('should throw error when party does not appear after max retries', async () => {
                vi.useFakeTimers()

                // Mock checkIfPartyExists - party doesn't exist yet
                ledgerProvider.request
                    .mockResolvedValueOnce({
                        partyDetails: [],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock allocate call
                    .mockResolvedValueOnce({
                        partyId: 'partyId',
                    } satisfies LedgerCommonSchemas['AllocateExternalPartyResponse'])
                    // Mock checkIfPartyExists polling - party never exists (30 times for default maxTries)
                    .mockResolvedValue({
                        partyDetails: [],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])

                const executePromise = signedParty.execute()

                // Run timers and wait for rejection
                const runTimersPromise = vi.runAllTimersAsync()
                await Promise.all([
                    expect(executePromise).rejects.toThrow(
                        'timed out waiting for new party to appear'
                    ),
                    runTimersPromise,
                ])

                vi.useRealTimers()
            })

            it('should throw error when granting user rights fails', async () => {
                // Mock checkIfPartyExists - party doesn't exist yet
                ledgerProvider.request
                    .mockResolvedValueOnce({
                        partyDetails: [],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock allocate call
                    .mockResolvedValueOnce({
                        partyId: 'partyId',
                    } satisfies LedgerCommonSchemas['AllocateExternalPartyResponse'])
                    // Mock checkIfPartyExists polling - party exists
                    .mockResolvedValueOnce({
                        partyDetails: [
                            {
                                party: partyTransaction.partyId,
                            },
                        ],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock grantRights call - fails to grant rights
                    .mockResolvedValueOnce(
                        {} satisfies LedgerCommonSchemas['GrantUserRightsResponse']
                    )

                await expect(signedParty.execute()).rejects.toThrow(
                    'Failed to grant user rights'
                )
            })

            it('should handle expectHeavyLoad with timeout and continue polling', async () => {
                vi.useFakeTimers()

                // Mock checkIfPartyExists - party doesn't exist yet
                ledgerProvider.request
                    .mockResolvedValueOnce({
                        partyDetails: [],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock allocate call - throws timeout error
                    .mockRejectedValueOnce(
                        new Error(
                            'The server was not able to produce a timely response to your request'
                        )
                    )
                    // Mock checkIfPartyExists in error handler loop - party doesn't exist (1st check)
                    .mockResolvedValueOnce({
                        partyDetails: [],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock checkIfPartyExists in error handler loop - party now exists (2nd check)
                    .mockResolvedValueOnce({
                        partyDetails: [
                            {
                                party: partyTransaction.partyId,
                            },
                        ],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock checkIfPartyExists in waitForPartyAndGrantUserRights - party exists
                    .mockResolvedValueOnce({
                        partyDetails: [
                            {
                                party: partyTransaction.partyId,
                            },
                        ],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock grantRights call
                    .mockResolvedValueOnce({
                        newlyGrantedRights: [{}],
                    } satisfies LedgerCommonSchemas['GrantUserRightsResponse'])

                const resultPromise = signedParty.execute({
                    expectHeavyLoad: true,
                })
                await vi.runAllTimersAsync()
                const result = await resultPromise

                expect(result).toEqual(partyTransaction)

                vi.useRealTimers()
            })

            it('should throw error when expectHeavyLoad is false and allocate times out', async () => {
                // Mock checkIfPartyExists - party doesn't exist yet
                ledgerProvider.request
                    .mockResolvedValueOnce({
                        partyDetails: [],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock allocate call - throws timeout error
                    .mockRejectedValueOnce(
                        new Error(
                            'The server was not able to produce a timely response to your request'
                        )
                    )

                await expect(
                    signedParty.execute({ expectHeavyLoad: false })
                ).rejects.toThrow(
                    'The server was not able to produce a timely response to your request'
                )
            })

            it('should throw error for non-timeout errors regardless of expectHeavyLoad', async () => {
                // Mock checkIfPartyExists - party doesn't exist yet
                ledgerProvider.request
                    .mockResolvedValueOnce({
                        partyDetails: [],
                    } satisfies LedgerCommonSchemas['GetPartiesResponse'])
                    // Mock allocate call - throws non-timeout error
                    .mockRejectedValueOnce(new Error('Invalid party data'))

                await expect(
                    signedParty.execute({ expectHeavyLoad: true })
                ).rejects.toThrow('Invalid party data')
            })
        })
    })
})
