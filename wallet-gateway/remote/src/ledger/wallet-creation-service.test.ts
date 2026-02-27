// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    jest,
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
} from '@jest/globals'
import { pino } from 'pino'
import { sink } from 'pino-test'
import type { Logger } from 'pino'
import { WalletCreationService } from './wallet-creation-service.js'
import type { PartyAllocationService } from './party-allocation-service.js'
import type { Store, Wallet } from '@canton-network/core-wallet-store'
import { SigningProvider } from '@canton-network/core-signing-lib'
import type { SigningDriverInterface } from '@canton-network/core-signing-lib'
import type { SigningProviderContext } from '../user-api/rpc-gen/typings.js'
import type { AllocatedParty } from './party-allocation-service.js'

const createWallet = (
    partyId: string,
    overrides: Partial<Wallet> = {}
): Wallet => ({
    primary: false,
    partyId,
    status: 'allocated',
    hint: partyId.split('::')[0],
    signingProviderId: 'internal',
    publicKey: 'test-public-key',
    namespace: 'namespace',
    networkId: 'network1',
    disabled: false,
    ...overrides,
})

const createAllocatedParty = (
    partyId: string,
    hint: string,
    namespace: string
): AllocatedParty => ({
    partyId,
    hint,
    namespace,
})

const defaultContext: SigningProviderContext = {
    partyId: 'alice::namespace',
    externalTxId: 'tx-1',
    topologyTransactions: 'tx1, tx2',
    namespace: 'namespace',
}

function createFireblocksDriver(getTransactionResult: {
    txId: string
    status: string
    signature?: string
}): SigningDriverInterface {
    const getKeysResult = {
        keys: [{ id: 'key-1', name: 'Canton Party', publicKey: 'fb-pk' }],
    }
    return {
        controller: jest.fn().mockReturnValue({
            getKeys: jest
                .fn<
                    () => Promise<{
                        keys: Array<{
                            id: string
                            name: string
                            publicKey: string
                        }>
                    }>
                >()
                .mockResolvedValue(getKeysResult),
            getTransaction: jest
                .fn<
                    () => Promise<{
                        txId: string
                        status: string
                        signature?: string
                    }>
                >()
                .mockResolvedValue(getTransactionResult),
        }),
    } as unknown as SigningDriverInterface
}

function createBlockdaemonDriver(getTransactionResult: {
    txId: string
    status: string
    signature?: string
}): SigningDriverInterface {
    return {
        controller: jest.fn().mockReturnValue({
            getTransaction: jest
                .fn<
                    () => Promise<{
                        txId: string
                        status: string
                        signature?: string
                    }>
                >()
                .mockResolvedValue(getTransactionResult),
        }),
    } as unknown as SigningDriverInterface
}

describe('WalletCreationService', () => {
    let mockLogger: Logger
    let mockStore: {
        getWallets: ReturnType<typeof jest.fn>
        removeWallet: ReturnType<typeof jest.fn>
    }
    let mockPartyAllocator: {
        allocateParty: ReturnType<typeof jest.fn>
        allocatePartyWithExistingWallet: ReturnType<typeof jest.fn>
        createFingerprintFromKey: ReturnType<typeof jest.fn>
        generateTopologyTransactions: ReturnType<typeof jest.fn>
    }
    let mockController: {
        createKey: ReturnType<typeof jest.fn>
        signTransaction: ReturnType<typeof jest.fn>
    }
    let mockWalletKernelDriver: SigningDriverInterface
    let service: WalletCreationService

    const createService = (
        drivers: Partial<Record<SigningProvider, SigningDriverInterface>>
    ) =>
        new WalletCreationService(
            mockStore as unknown as Store,
            mockLogger,
            mockPartyAllocator as unknown as PartyAllocationService,
            drivers
        )

    beforeEach(async () => {
        mockLogger = pino(sink()) as Logger
        mockStore = {
            getWallets: jest.fn(),
            removeWallet: jest.fn(),
        }

        mockPartyAllocator = {
            allocateParty: jest.fn(),
            allocatePartyWithExistingWallet: jest.fn(),
            createFingerprintFromKey: jest.fn().mockReturnValue('fingerprint'),
            generateTopologyTransactions: jest
                .fn<
                    () => Promise<{
                        topologyTransactions: string[]
                        multiHash: string
                    }>
                >()
                .mockResolvedValue({
                    topologyTransactions: ['tx1'],
                    multiHash: 'hash',
                }),
        }

        mockController = {
            createKey: jest
                .fn<
                    () => Promise<{
                        id: string
                        name: string
                        publicKey: string
                    }>
                >()
                .mockResolvedValue({
                    id: 'key-id',
                    name: 'test-key',
                    publicKey: 'new-public-key',
                }),
            signTransaction: jest
                .fn<
                    () => Promise<{
                        txId: string
                        status: string
                        signature: string
                    }>
                >()
                .mockResolvedValue({
                    txId: 'tx-id',
                    status: 'signed',
                    signature: 'sig',
                }),
        }

        mockWalletKernelDriver = {
            controller: jest.fn(() => mockController),
        } as unknown as SigningDriverInterface

        service = createService({
            [SigningProvider.WALLET_KERNEL]: mockWalletKernelDriver,
        })
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('Participant', () => {
        it('allocates new party when no signingProviderContext', async () => {
            const expectedParty = createAllocatedParty(
                'alice::participant1',
                'alice',
                'participant1'
            )
            mockPartyAllocator.allocateParty.mockResolvedValue(expectedParty)

            const result = await service.createParticipantWallet(
                'user-1',
                'alice'
            )

            expect(result).toEqual(expectedParty)
            expect(mockPartyAllocator.allocateParty).toHaveBeenCalledWith(
                'user-1',
                'alice'
            )
            expect(mockStore.getWallets).not.toHaveBeenCalled()
        })

        it('reallocates existing wallet when signingProviderContext provided', async () => {
            const existingWallet = createWallet('alice::participant1')
            const expectedParty = createAllocatedParty(
                'alice::participant1',
                'alice',
                'participant1'
            )
            mockStore.getWallets.mockResolvedValue([existingWallet])
            mockPartyAllocator.allocateParty.mockResolvedValue(expectedParty)

            const result = await service.createParticipantWallet(
                'user-1',
                'alice',
                {
                    partyId: 'alice::participant1',
                    externalTxId: '',
                    topologyTransactions: '',
                    namespace: 'participant1',
                }
            )

            expect(result).toEqual(expectedParty)
            expect(mockStore.getWallets).toHaveBeenCalled()
            expect(mockPartyAllocator.allocateParty).toHaveBeenCalledWith(
                'user-1',
                'alice'
            )
        })

        it('throws when wallet not found for signingProviderContext', async () => {
            mockStore.getWallets.mockResolvedValue([])

            await expect(
                service.createParticipantWallet('user-1', 'alice', {
                    partyId: 'alice::participant1',
                    externalTxId: '',
                    topologyTransactions: '',
                    namespace: 'participant1',
                })
            ).rejects.toThrow('Wallet not found for party alice::participant1')
        })

        it('reallocateParticipantWallet calls allocateParty with wallet hint', async () => {
            const wallet = createWallet('alice::participant1')
            const expectedParty = createAllocatedParty(
                'alice::participant1',
                'alice',
                'participant1'
            )
            mockPartyAllocator.allocateParty.mockResolvedValue(expectedParty)

            const result = await service.reallocateParticipantWallet(
                'user-1',
                wallet
            )

            expect(result).toEqual(expectedParty)
            expect(mockPartyAllocator.allocateParty).toHaveBeenCalledWith(
                'user-1',
                'alice'
            )
        })
    })

    describe('Wallet Kernel', () => {
        it('initializes new wallet when no signingProviderContext', async () => {
            const expectedParty = createAllocatedParty(
                'bob::fingerprint',
                'bob',
                'fingerprint'
            )
            mockPartyAllocator.createFingerprintFromKey.mockReturnValue(
                'fingerprint'
            )
            mockPartyAllocator.allocateParty.mockResolvedValue(expectedParty)

            const result = await service.createWalletKernelWallet(
                'user-1',
                'bob'
            )

            expect(result.party).toEqual(expectedParty)
            expect(result.publicKey).toBe('new-public-key')
            expect(
                (
                    mockWalletKernelDriver as unknown as {
                        controller: jest.Mock
                    }
                ).controller
            ).toHaveBeenCalledWith('user-1')
            expect(mockController.createKey).toHaveBeenCalledWith({
                name: 'bob',
            })
            expect(mockStore.getWallets).not.toHaveBeenCalled()
        })

        it('reallocates existing wallet when signingProviderContext provided', async () => {
            const existingWallet = createWallet('bob::fingerprint', {
                publicKey: 'existing-public-key',
            })
            const expectedParty = createAllocatedParty(
                'bob::fingerprint',
                'bob',
                'fingerprint'
            )
            mockStore.getWallets.mockResolvedValue([existingWallet])
            mockPartyAllocator.allocateParty.mockImplementation(
                async (_userId, _hint, _publicKey?, signingCallback?) => {
                    if (signingCallback) {
                        await signingCallback('test-hash')
                    }
                    return expectedParty
                }
            )

            const result = await service.createWalletKernelWallet(
                'user-1',
                'bob',
                {
                    partyId: 'bob::fingerprint',
                    externalTxId: '',
                    topologyTransactions: '',
                    namespace: 'fingerprint',
                }
            )

            expect(result.party).toEqual(expectedParty)
            expect(result.publicKey).toBe('existing-public-key')
            expect(mockStore.getWallets).toHaveBeenCalled()
            expect(mockController.signTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    txHash: 'test-hash',
                    keyIdentifier: { publicKey: 'existing-public-key' },
                })
            )
        })

        it('throws when wallet not found for signingProviderContext', async () => {
            mockStore.getWallets.mockResolvedValue([])

            await expect(
                service.createWalletKernelWallet('user-1', 'bob', {
                    partyId: 'bob::fingerprint',
                    externalTxId: '',
                    topologyTransactions: '',
                    namespace: 'fingerprint',
                })
            ).rejects.toThrow('Wallet not found for party bob::fingerprint')
        })

        it('throws when Wallet Kernel signing driver not available', async () => {
            const serviceWithoutDriver = createService({})

            await expect(
                serviceWithoutDriver.createWalletKernelWallet('user-1', 'bob')
            ).rejects.toThrow('Wallet Kernel signing driver not available')
        })

        it('reallocateWalletKernelWallet calls allocateWalletKernelParty with wallet hint and publicKey', async () => {
            const wallet = createWallet('bob::fingerprint', {
                hint: 'bob',
                publicKey: 'wallet-public-key',
            })
            const expectedParty = createAllocatedParty(
                'bob::fingerprint',
                'bob',
                'fingerprint'
            )
            mockPartyAllocator.allocateParty.mockImplementation(
                async (_userId, _hint, _publicKey?, signingCallback?) => {
                    if (signingCallback) {
                        await signingCallback('topology-hash')
                    }
                    return expectedParty
                }
            )

            const result = await service.reallocateWalletKernelWallet(
                'user-1',
                wallet
            )

            expect(result).toEqual(expectedParty)
            expect(mockController.signTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    txHash: 'topology-hash',
                    keyIdentifier: { publicKey: 'wallet-public-key' },
                })
            )
        })
    })

    describe('Fireblocks', () => {
        it('throws when Fireblocks signing driver not available', async () => {
            const serviceWithoutFireblocks = createService({})

            await expect(
                serviceWithoutFireblocks.createFireblocksWallet(
                    'user-1',
                    'alice'
                )
            ).rejects.toThrow('Fireblocks signing driver not available')
        })

        it('returns allocated when getTransaction returns signed', async () => {
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                    txId: 'tx-1',
                    status: 'signed',
                    signature: 'deadbeef',
                }),
            })
            mockPartyAllocator.allocatePartyWithExistingWallet.mockResolvedValue(
                'alice::namespace'
            )

            const result = await serviceWithFireblocks.createFireblocksWallet(
                'user-1',
                'alice',
                defaultContext
            )

            expect(result.walletStatus).toBe('allocated')
            expect(result.party.partyId).toBe('alice::namespace')
            expect(result.txId).toBe('tx-1')
            expect(result.topologyTransactions).toEqual(['tx1', 'tx2'])
        })

        it('returns initialized when getTransaction returns pending', async () => {
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                    txId: 'tx-1',
                    status: 'pending',
                }),
            })

            const result = await serviceWithFireblocks.createFireblocksWallet(
                'user-1',
                'alice',
                defaultContext
            )

            expect(result.walletStatus).toBe('initialized')
            expect(result.removed).toBeUndefined()
            expect(
                mockPartyAllocator.allocatePartyWithExistingWallet
            ).not.toHaveBeenCalled()
            expect(mockStore.removeWallet).not.toHaveBeenCalled()
        })

        it.each([['failed'], ['rejected']] as const)(
            'removes wallet and returns removed when getTransaction returns %s',
            async (status) => {
                const serviceWithFireblocks = createService({
                    [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                        txId: 'tx-1',
                        status,
                    }),
                })

                const result =
                    await serviceWithFireblocks.createFireblocksWallet(
                        'user-1',
                        'alice',
                        defaultContext
                    )

                expect(result.walletStatus).toBe('initialized')
                expect(result.removed).toEqual({ txStatus: status })
                expect(
                    mockPartyAllocator.allocatePartyWithExistingWallet
                ).not.toHaveBeenCalled()
                expect(mockStore.removeWallet).toHaveBeenCalledWith(
                    'alice::namespace'
                )
            }
        )
    })

    describe('Blockdaemon', () => {
        it('throws when Blockdaemon signing driver not available', async () => {
            const serviceWithoutBlockdaemon = createService({})

            await expect(
                serviceWithoutBlockdaemon.createBlockdaemonWallet(
                    'user-1',
                    'alice'
                )
            ).rejects.toThrow('Blockdaemon signing driver not available')
        })

        it('returns allocated when getTransaction returns signed', async () => {
            const serviceWithBlockdaemon = createService({
                [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({
                    txId: 'tx-1',
                    status: 'signed',
                    signature: 'sig-base64',
                }),
            })
            mockPartyAllocator.allocatePartyWithExistingWallet.mockResolvedValue(
                'alice::namespace'
            )

            const result = await serviceWithBlockdaemon.createBlockdaemonWallet(
                'user-1',
                'alice',
                defaultContext
            )

            expect(result.walletStatus).toBe('allocated')
            expect(result.party.partyId).toBe('alice::namespace')
            expect(result.txId).toBe('tx-1')
            expect(result.topologyTransactions).toEqual(['tx1', 'tx2'])
        })

        it('returns initialized when getTransaction returns pending', async () => {
            const serviceWithBlockdaemon = createService({
                [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({
                    txId: 'tx-1',
                    status: 'pending',
                }),
            })

            const result = await serviceWithBlockdaemon.createBlockdaemonWallet(
                'user-1',
                'alice',
                defaultContext
            )

            expect(result.walletStatus).toBe('initialized')
            expect(result.removed).toBeUndefined()
            expect(
                mockPartyAllocator.allocatePartyWithExistingWallet
            ).not.toHaveBeenCalled()
            expect(mockStore.removeWallet).not.toHaveBeenCalled()
        })

        it.each([['failed'], ['rejected']] as const)(
            'removes wallet and returns removed when getTransaction returns %s',
            async (status) => {
                const serviceWithBlockdaemon = createService({
                    [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({
                        txId: 'tx-1',
                        status,
                    }),
                })

                const result =
                    await serviceWithBlockdaemon.createBlockdaemonWallet(
                        'user-1',
                        'alice',
                        defaultContext
                    )

                expect(result.walletStatus).toBe('initialized')
                expect(result.removed).toEqual({ txStatus: status })
                expect(
                    mockPartyAllocator.allocatePartyWithExistingWallet
                ).not.toHaveBeenCalled()
                expect(mockStore.removeWallet).toHaveBeenCalledWith(
                    'alice::namespace'
                )
            }
        )
    })
})
