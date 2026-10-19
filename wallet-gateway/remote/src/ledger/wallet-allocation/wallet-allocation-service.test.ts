// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    vi,
    describe,
    it,
    expect,
    beforeEach,
    afterEach,
    type Mock,
} from 'vitest'
import { pino } from 'pino'
import { sink } from 'pino-test'
import type { Logger } from 'pino'
import { WalletAllocationService } from './wallet-allocation-service.js'
import type { PartyAllocationService } from '../party-allocation-service.js'
import type { Store, Wallet } from '@canton-network/core-wallet-store'
import { SigningProvider } from '@canton-network/core-signing-lib'
import type { SigningDriverInterface } from '@canton-network/core-signing-lib'
import type { AllocatedParty } from '../party-allocation-service.js'
import { WALLET_DISABLED_REASON } from '@canton-network/core-types'

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
    userId: 'user-1',
    disabled: false,
    rights: [],
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

const authContext = {
    userId: 'user-1',
    accessToken: 'access-token',
    email: 'user-1@example.com',
}

const FIREBLOCKS_VAULT_NAME = 'Canton Party'

function createFireblocksDriver(options: {
    getKeysResult?:
        | {
              keys: Array<{
                  id: string
                  name: string
                  publicKey: string
              }>
          }
        | { error: string; error_description: string }
    signTransactionResult?: { status: string; txId: string }
    getTransactionResult?: {
        txId: string
        status: string
        signature?: string
    }
}): SigningDriverInterface {
    const getKeysResult = options.getKeysResult ?? {
        keys: [{ id: 'key-1', name: 'Canton Party', publicKey: 'fb-pk' }],
    }
    const signTransactionResult = options.signTransactionResult ?? {
        status: 'pending',
        txId: 'tx-1',
    }
    const getTransactionResult =
        options.getTransactionResult ?? signTransactionResult
    return {
        controller: vi.fn().mockReturnValue({
            getKeys: vi
                .fn<
                    () => Promise<
                        | {
                              keys: Array<{
                                  id: string
                                  name: string
                                  publicKey: string
                              }>
                          }
                        | { error: string; error_description: string }
                    >
                >()
                .mockResolvedValue(getKeysResult),
            signTransaction: vi
                .fn<() => Promise<{ status: string; txId: string }>>()
                .mockResolvedValue(signTransactionResult),
            getTransaction: vi
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

function createBlockdaemonDriver(options: {
    createKeyResult?:
        | { publicKey: string }
        | { error: string; error_description: string }
    signTransactionResult?: { status: string; txId: string }
    getTransactionResult?: {
        txId: string
        status: string
        signature?: string
        metadata?: unknown
    }
}): SigningDriverInterface {
    const createKeyResult = options.createKeyResult ?? {
        publicKey: 'bd-pk',
    }
    const signTransactionResult = options.signTransactionResult ?? {
        status: 'pending',
        txId: 'tx-1',
    }
    const getTransactionResult =
        options.getTransactionResult ?? signTransactionResult
    return {
        controller: vi.fn().mockReturnValue({
            createKey: vi
                .fn<
                    () => Promise<
                        | { publicKey: string }
                        | { error: string; error_description: string }
                    >
                >()
                .mockResolvedValue(createKeyResult),
            signTransaction: vi
                .fn<() => Promise<{ status: string; txId: string }>>()
                .mockResolvedValue(signTransactionResult),
            getTransaction: vi
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

function createDfnsDriver(options: {
    createKeyResult?:
        | { id: string; publicKey: string }
        | { error: string; error_description: string }
    signTransactionResult?: { status: string; txId: string }
    getTransactionResult?: {
        txId: string
        status: string
        signature?: string
        metadata?: unknown
    }
}): SigningDriverInterface {
    const createKeyResult = options.createKeyResult ?? {
        id: 'key-1',
        publicKey: 'dfns-pk',
    }
    const signTransactionResult = options.signTransactionResult ?? {
        status: 'pending',
        txId: 'tx-1',
    }
    const getTransactionResult =
        options.getTransactionResult ?? signTransactionResult
    return {
        controller: vi.fn().mockReturnValue({
            createKey: vi
                .fn<
                    () => Promise<
                        | { id: string; publicKey: string }
                        | { error: string; error_description: string }
                    >
                >()
                .mockResolvedValue(createKeyResult),
            signTransaction: vi
                .fn<() => Promise<{ status: string; txId: string }>>()
                .mockResolvedValue(signTransactionResult),
            getTransaction: vi
                .fn<
                    () => Promise<{
                        txId: string
                        status: string
                        signature?: string
                        metadata?: unknown
                    }>
                >()
                .mockResolvedValue(getTransactionResult),
        }),
    } as unknown as SigningDriverInterface
}

function createSecurosysDriver(options: {
    createKeyResult?:
        | { id: string; publicKey: string }
        | { error: string; error_description: string }
    signTransactionResult?: { status: string; txId: string }
    getTransactionResult?: {
        txId: string
        status: string
        signature?: string
        metadata?: unknown
    }
}): SigningDriverInterface {
    const createKeyResult = options.createKeyResult ?? {
        id: 'key-1',
        publicKey: 'securosys-pk',
    }
    const signTransactionResult = options.signTransactionResult ?? {
        status: 'pending',
        txId: 'tx-1',
    }
    const getTransactionResult =
        options.getTransactionResult ?? signTransactionResult
    return {
        controller: vi.fn().mockReturnValue({
            createKey: vi
                .fn<
                    () => Promise<
                        | { id: string; publicKey: string }
                        | { error: string; error_description: string }
                    >
                >()
                .mockResolvedValue(createKeyResult),
            signTransaction: vi
                .fn<() => Promise<{ status: string; txId: string }>>()
                .mockResolvedValue(signTransactionResult),
            getTransaction: vi
                .fn<
                    () => Promise<{
                        txId: string
                        status: string
                        signature?: string
                        metadata?: unknown
                    }>
                >()
                .mockResolvedValue(getTransactionResult),
        }),
    } as unknown as SigningDriverInterface
}

describe('WalletAllocationService', () => {
    let mockLogger: Logger
    let mockStore: {
        getWallets: ReturnType<typeof vi.fn>
        removeWallet: ReturnType<typeof vi.fn>
        addWallet: ReturnType<typeof vi.fn>
        updateWallet: ReturnType<typeof vi.fn>
        getCurrentNetwork: ReturnType<typeof vi.fn>
    }
    let mockPartyAllocator: {
        allocateParty: ReturnType<typeof vi.fn>
        allocatePartyWithExistingWallet: ReturnType<typeof vi.fn>
        createFingerprintFromKey: ReturnType<typeof vi.fn>
        generateTopologyTransactions: ReturnType<typeof vi.fn>
    }
    let mockController: {
        createKey: ReturnType<typeof vi.fn>
        signTransaction: ReturnType<typeof vi.fn>
    }
    let mockWalletKernelDriver: SigningDriverInterface
    let service: WalletAllocationService

    const createService = (
        drivers: Partial<Record<SigningProvider, SigningDriverInterface>>
    ) =>
        new WalletAllocationService(
            mockStore as unknown as Store,
            mockLogger,
            mockPartyAllocator as unknown as PartyAllocationService,
            drivers
        )

    beforeEach(async () => {
        mockLogger = pino(sink()) as Logger
        mockStore = {
            getWallets: vi.fn(),
            removeWallet: vi.fn(),
            addWallet: vi.fn(),
            updateWallet: vi.fn(),
            getCurrentNetwork: vi
                .fn<() => Promise<{ id: string }>>()
                .mockResolvedValue({ id: 'network1' }),
        }

        mockPartyAllocator = {
            allocateParty: vi.fn(),
            allocatePartyWithExistingWallet: vi.fn(),
            createFingerprintFromKey: vi.fn().mockReturnValue('fingerprint'),
            generateTopologyTransactions: vi
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
            createKey: vi
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
            signTransaction: vi
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
            controller: vi.fn(() => mockController),
        } as unknown as SigningDriverInterface

        service = createService({
            [SigningProvider.WALLET_KERNEL]: mockWalletKernelDriver,
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('Participant', () => {
        it('createWallet allocates new party and adds wallet', async () => {
            const expectedParty = createAllocatedParty(
                'alice::participant1',
                'alice',
                'participant1'
            )
            mockPartyAllocator.allocateParty.mockResolvedValue(expectedParty)

            const result = await service.createWallet(
                authContext,
                'alice',
                false,
                SigningProvider.PARTICIPANT
            )

            expect(mockPartyAllocator.allocateParty).toHaveBeenCalledWith(
                authContext.userId,
                'alice'
            )
            expect(mockStore.addWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    partyId: 'alice::participant1',
                    status: 'allocated',
                    networkId: 'network1',
                })
            )
            expect(result.partyId).toBe('alice::participant1')
            expect(result.status).toBe('allocated')
        })

        it('allocateParty allocates party and updates store', async () => {
            const expectedParty = createAllocatedParty(
                'alice::participant1',
                'alice',
                'participant1'
            )
            mockPartyAllocator.allocateParty.mockResolvedValue(expectedParty)
            const existingWallet = createWallet('alice::namespace', {
                hint: 'alice',
                namespace: 'namespace',
                signingProviderId: SigningProvider.PARTICIPANT,
            })

            await service.allocateParty(
                authContext,
                existingWallet,
                SigningProvider.PARTICIPANT
            )

            expect(mockPartyAllocator.allocateParty).toHaveBeenCalledWith(
                authContext.userId,
                'alice'
            )
            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                partyId: 'alice::participant1',
                networkId: 'network1',
                status: 'allocated',
            })
        })
    })

    describe('Wallet Gateway', () => {
        it('createWallet initializes new wallet and adds to store', async () => {
            const expectedParty = createAllocatedParty(
                'bob::fingerprint',
                'bob',
                'fingerprint'
            )
            mockPartyAllocator.createFingerprintFromKey.mockReturnValue(
                'fingerprint'
            )
            mockPartyAllocator.allocateParty.mockResolvedValue(expectedParty)

            const result = await service.createWallet(
                authContext,
                'bob',
                false,
                SigningProvider.WALLET_KERNEL
            )

            expect(mockStore.addWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    partyId: 'bob::fingerprint',
                    status: 'allocated',
                    publicKey: 'new-public-key',
                })
            )
            expect(result.partyId).toBe('bob::fingerprint')
            expect(result.publicKey).toBe('new-public-key')
            expect(
                (
                    mockWalletKernelDriver as unknown as {
                        controller: Mock
                    }
                ).controller
            ).toHaveBeenCalledWith(authContext.userId)
            expect(mockController.createKey).toHaveBeenCalledWith({
                name: 'bob',
            })
        })

        it('allocateParty allocates with existing public key and updates store', async () => {
            const expectedParty = createAllocatedParty(
                'bob::fingerprint',
                'bob',
                'fingerprint'
            )
            mockPartyAllocator.allocateParty.mockImplementation(
                async (_userId, _hint, _publicKey?, signingCallback?) => {
                    if (signingCallback) {
                        await signingCallback('test-hash')
                    }
                    return expectedParty
                }
            )
            const existingWallet = createWallet('bob::namespace', {
                hint: 'bob',
                publicKey: 'existing-public-key',
                signingProviderId: SigningProvider.WALLET_KERNEL,
            })

            await service.allocateParty(
                authContext,
                existingWallet,
                SigningProvider.WALLET_KERNEL
            )

            expect(mockController.signTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    txHash: 'test-hash',
                    keyIdentifier: { publicKey: 'existing-public-key' },
                })
            )
            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                partyId: 'bob::fingerprint',
                networkId: 'network1',
                status: 'allocated',
            })
        })

        it('throws when Wallet Gateway signing driver not available', async () => {
            const serviceWithoutDriver = createService({})

            await expect(
                serviceWithoutDriver.createWallet(
                    authContext,
                    'bob',
                    false,
                    SigningProvider.WALLET_KERNEL
                )
            ).rejects.toThrow('Wallet Gateway signing driver not available')
        })

        it('throws when createKey returns a signing error', async () => {
            mockController.createKey.mockResolvedValue({
                error: 'denied',
                error_description: 'Key creation failed',
            })

            await expect(
                service.createWallet(
                    authContext,
                    'bob',
                    false,
                    SigningProvider.WALLET_KERNEL
                )
            ).rejects.toThrow('Error from signing driver: Key creation failed')
        })

        it('throws when signing the topology hash returns a driver error', async () => {
            mockPartyAllocator.allocateParty.mockImplementation(
                async (
                    _userId,
                    _hint,
                    _publicKey?,
                    signingCallback?: (hash: string) => Promise<string>
                ) => {
                    await signingCallback?.('hash')
                    return createAllocatedParty(
                        'bob::fingerprint',
                        'bob',
                        'fingerprint'
                    )
                }
            )
            mockController.signTransaction.mockResolvedValue({
                error: 'denied',
                error_description: 'Signing failed',
            })

            await expect(
                service.createWallet(
                    authContext,
                    'bob',
                    false,
                    SigningProvider.WALLET_KERNEL
                )
            ).rejects.toThrow('Error from signing driver: Signing failed')
        })

        it('throws when signing the topology hash returns no signature', async () => {
            mockPartyAllocator.allocateParty.mockImplementation(
                async (
                    _userId,
                    _hint,
                    _publicKey?,
                    signingCallback?: (hash: string) => Promise<string>
                ) => {
                    await signingCallback?.('hash')
                    return createAllocatedParty(
                        'bob::fingerprint',
                        'bob',
                        'fingerprint'
                    )
                }
            )
            mockController.signTransaction.mockResolvedValue({
                signature: undefined,
            })

            await expect(
                service.createWallet(
                    authContext,
                    'bob',
                    false,
                    SigningProvider.WALLET_KERNEL
                )
            ).rejects.toThrow('No signature returned from signing driver')
        })

        it('throws when allocateParty signing callback returns no signature', async () => {
            mockPartyAllocator.allocateParty.mockImplementation(
                async (
                    _userId,
                    _hint,
                    _publicKey?,
                    signingCallback?: (hash: string) => Promise<string>
                ) => {
                    await signingCallback?.('hash')
                    return createAllocatedParty(
                        'bob::fingerprint',
                        'bob',
                        'fingerprint'
                    )
                }
            )
            mockController.signTransaction.mockResolvedValue({
                signature: undefined,
            })
            const existingWallet = createWallet('bob::namespace', {
                hint: 'bob',
                publicKey: 'existing-public-key',
                signingProviderId: SigningProvider.WALLET_KERNEL,
            })

            await expect(
                service.allocateParty(
                    authContext,
                    existingWallet,
                    SigningProvider.WALLET_KERNEL
                )
            ).rejects.toThrow('No signature returned from signing driver')
        })
    })

    describe('Fireblocks', () => {
        it('throws when Fireblocks signing driver not available', async () => {
            const serviceWithoutFireblocks = createService({})

            await expect(
                serviceWithoutFireblocks.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.FIREBLOCKS
                )
            ).rejects.toThrow('Fireblocks signing driver not available')
        })

        it('createWallet returns allocated when signTransaction returns signed', async () => {
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                    signTransactionResult: { status: 'signed', txId: 'tx-1' },
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'signed',
                        signature: 'deadbeef',
                    },
                }),
            })
            mockPartyAllocator.allocatePartyWithExistingWallet.mockResolvedValue(
                'alice::namespace'
            )

            const result = await serviceWithFireblocks.createWallet(
                authContext,
                'alice',
                false,
                SigningProvider.FIREBLOCKS,
                FIREBLOCKS_VAULT_NAME
            )

            expect(result.status).toBe('allocated')
            expect(result.partyId).toBe('alice::namespace')
            expect(
                mockPartyAllocator.allocatePartyWithExistingWallet
            ).toHaveBeenCalled()
            expect(mockStore.addWallet).toHaveBeenCalled()
        })

        it('createWallet returns initialized when signTransaction returns pending', async () => {
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                    signTransactionResult: { status: 'pending', txId: 'tx-1' },
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'pending',
                    },
                }),
            })

            const result = await serviceWithFireblocks.createWallet(
                authContext,
                'alice',
                false,
                SigningProvider.FIREBLOCKS,
                FIREBLOCKS_VAULT_NAME
            )

            expect(result.status).toBe('initialized')
            expect(
                mockPartyAllocator.allocatePartyWithExistingWallet
            ).not.toHaveBeenCalled()
            expect(mockStore.addWallet).toHaveBeenCalled()
        })

        it.each([
            ['failed', WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_FAILED],
            ['rejected', WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_REJECTED],
        ] as const)(
            'createWallet returns status removed with reason when signTransaction returns %s',
            async (status, expectedReason) => {
                const serviceWithFireblocks = createService({
                    [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                        signTransactionResult: { status, txId: 'tx-1' },
                        getTransactionResult: {
                            txId: 'tx-1',
                            status,
                        },
                    }),
                })

                const result = await serviceWithFireblocks.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.FIREBLOCKS,
                    FIREBLOCKS_VAULT_NAME
                )

                expect(result.status).toBe('removed')
                expect(result.reason).toBe(expectedReason)
                expect(
                    mockPartyAllocator.allocatePartyWithExistingWallet
                ).not.toHaveBeenCalled()
                expect(mockStore.addWallet).toHaveBeenCalled()
            }
        )

        it('createWallet handles missing topology transactions from party allocator', async () => {
            mockPartyAllocator.generateTopologyTransactions.mockResolvedValue({
                topologyTransactions: undefined,
                multiHash: 'multi-hash',
            })
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                    signTransactionResult: { status: 'pending', txId: 'tx-1' },
                }),
            })

            const result = await serviceWithFireblocks.createWallet(
                authContext,
                'alice',
                false,
                SigningProvider.FIREBLOCKS,
                FIREBLOCKS_VAULT_NAME
            )

            expect(result.topologyTransactions).toBe('')
        })

        it('throws when getKeys returns a signing error', async () => {
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                    getKeysResult: {
                        error: 'denied',
                        error_description: 'Keys unavailable',
                    },
                }),
            })

            await expect(
                serviceWithFireblocks.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.FIREBLOCKS,
                    FIREBLOCKS_VAULT_NAME
                )
            ).rejects.toThrow('Error from signing driver: Keys unavailable')
        })

        it('throws when keyName is missing for Fireblocks', async () => {
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({}),
            })

            await expect(
                serviceWithFireblocks.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.FIREBLOCKS
                )
            ).rejects.toThrow(
                'keyName is required for creating a wallet with Fireblocks'
            )
        })

        it('throws when the selected Fireblocks vault is missing', async () => {
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                    getKeysResult: { keys: [] },
                }),
            })

            await expect(
                serviceWithFireblocks.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.FIREBLOCKS,
                    'missing-vault'
                )
            ).rejects.toThrow('Fireblocks key not found')
        })

        it('getKeys returns key names for Fireblocks', async () => {
            const keys = [
                {
                    id: 'key-1',
                    name: 'Vault A',
                    publicKey: 'fb-pk-a',
                },
                {
                    id: 'key-2',
                    name: 'Vault B',
                    publicKey: 'fb-pk-b',
                },
            ]
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                    getKeysResult: {
                        keys,
                    },
                }),
            })

            const result = await serviceWithFireblocks.getKeys(
                authContext,
                SigningProvider.FIREBLOCKS
            )

            expect(result).toEqual({ keys })
        })

        it('throws error when listing vaults for an unsupported signing provider', async () => {
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({}),
            })

            await expect(
                serviceWithFireblocks.getKeys(
                    authContext,
                    SigningProvider.PARTICIPANT
                )
            ).rejects.toThrow()
        })

        it('throws when a signed createWallet has no signature in getTransaction', async () => {
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                    signTransactionResult: { status: 'signed', txId: 'tx-1' },
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'signed',
                    },
                }),
            })

            await expect(
                serviceWithFireblocks.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.FIREBLOCKS,
                    FIREBLOCKS_VAULT_NAME
                )
            ).rejects.toThrow(
                'Transaction signed but no signature found in result'
            )
        })

        it('throws when allocateParty wallet is missing topology metadata', async () => {
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({}),
            })

            await expect(
                serviceWithFireblocks.allocateParty(
                    authContext,
                    createWallet('alice::fingerprint', {
                        signingProviderId: SigningProvider.FIREBLOCKS,
                        topologyTransactions: undefined,
                        externalTxId: 'tx-1',
                    }),
                    SigningProvider.FIREBLOCKS
                )
            ).rejects.toThrow(
                'Existing wallet is missing field externalTxId or topologyTransactions'
            )
        })

        it('allocateParty updates wallet to pending state', async () => {
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                    getTransactionResult: { txId: 'tx-1', status: 'pending' },
                }),
            })

            await serviceWithFireblocks.allocateParty(
                authContext,
                createWallet('alice::fingerprint', {
                    signingProviderId: SigningProvider.FIREBLOCKS,
                    topologyTransactions: 'tx1',
                    externalTxId: 'tx-1',
                }),
                SigningProvider.FIREBLOCKS
            )

            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                partyId: 'alice::fingerprint',
                networkId: 'network1',
                status: 'initialized',
                reason: WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_PENDING,
            })
        })

        it('allocateParty updates wallet to allocated when transaction is signed', async () => {
            const hexSignature = 'deadbeef'
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'signed',
                        signature: Buffer.from(hexSignature, 'hex').toString(
                            'base64'
                        ),
                    },
                }),
            })
            mockPartyAllocator.allocatePartyWithExistingWallet.mockResolvedValue(
                'alice::namespace'
            )

            await serviceWithFireblocks.allocateParty(
                authContext,
                createWallet('alice::fingerprint', {
                    signingProviderId: SigningProvider.FIREBLOCKS,
                    namespace: 'fingerprint',
                    topologyTransactions: 'tx1',
                    externalTxId: 'tx-1',
                }),
                SigningProvider.FIREBLOCKS
            )

            expect(
                mockPartyAllocator.allocatePartyWithExistingWallet
            ).toHaveBeenCalledWith(
                'fingerprint',
                ['tx1'],
                Buffer.from(hexSignature, 'hex').toString('base64'),
                'user-1'
            )
            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                networkId: 'network1',
                partyId: 'alice::namespace',
                status: 'allocated',
                reason: '',
            })
        })

        it('allocateParty disables wallet when transaction is rejected', async () => {
            const serviceWithFireblocks = createService({
                [SigningProvider.FIREBLOCKS]: createFireblocksDriver({
                    getTransactionResult: { txId: 'tx-1', status: 'rejected' },
                }),
            })

            await serviceWithFireblocks.allocateParty(
                authContext,
                createWallet('alice::fingerprint', {
                    signingProviderId: SigningProvider.FIREBLOCKS,
                    topologyTransactions: 'tx1',
                    externalTxId: 'tx-1',
                }),
                SigningProvider.FIREBLOCKS
            )

            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                partyId: 'alice::fingerprint',
                networkId: 'network1',
                status: 'removed',
                disabled: true,
                reason: WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_REJECTED,
            })
        })
    })

    describe('Blockdaemon', () => {
        it('throws when Blockdaemon signing driver not available', async () => {
            const serviceWithoutBlockdaemon = createService({})

            await expect(
                serviceWithoutBlockdaemon.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.BLOCKDAEMON
                )
            ).rejects.toThrow('Blockdaemon signing driver not available')
        })

        it('createWallet returns initialized when signTransaction returns pending', async () => {
            const serviceWithBlockdaemon = createService({
                [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({
                    signTransactionResult: { status: 'pending', txId: 'tx-1' },
                }),
            })

            const result = await serviceWithBlockdaemon.createWallet(
                authContext,
                'alice',
                false,
                SigningProvider.BLOCKDAEMON
            )

            expect(result.status).toBe('initialized')
            expect(result.reason).toBe(
                WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_PENDING
            )
            expect(result.externalTxId).toBe('tx-1')
            expect(result.partyId).toBe('alice::fingerprint')
            expect(
                mockPartyAllocator.allocatePartyWithExistingWallet
            ).not.toHaveBeenCalled()
            expect(mockStore.addWallet).toHaveBeenCalled()
        })

        it('createWallet returns allocated when signTransaction returns signed', async () => {
            const serviceWithBlockdaemon = createService({
                [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({
                    signTransactionResult: { status: 'signed', txId: 'tx-1' },
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'signed',
                        signature: 'sig-base64',
                    },
                }),
            })
            mockPartyAllocator.allocatePartyWithExistingWallet.mockResolvedValue(
                'alice::namespace'
            )

            const result = await serviceWithBlockdaemon.createWallet(
                authContext,
                'alice',
                false,
                SigningProvider.BLOCKDAEMON
            )

            expect(result.status).toBe('allocated')
            expect(result.partyId).toBe('alice::namespace')
            expect(
                mockPartyAllocator.allocatePartyWithExistingWallet
            ).toHaveBeenCalled()
            expect(mockStore.addWallet).toHaveBeenCalled()
        })

        it('throws when createKey returns an error object', async () => {
            const serviceWithBlockdaemon = createService({
                [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({
                    createKeyResult: {
                        error: 'denied',
                        error_description: 'Cannot create key',
                    },
                }),
            })

            await expect(
                serviceWithBlockdaemon.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.BLOCKDAEMON
                )
            ).rejects.toThrow('Failed to create key: Cannot create key')
        })

        it('throws when a signed createWallet has no signature in getTransaction', async () => {
            const serviceWithBlockdaemon = createService({
                [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({
                    signTransactionResult: { status: 'signed', txId: 'tx-1' },
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'signed',
                    },
                }),
            })

            await expect(
                serviceWithBlockdaemon.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.BLOCKDAEMON
                )
            ).rejects.toThrow(
                'Transaction signed but no signature found in result'
            )
        })

        it.each([
            ['failed', WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_FAILED],
            ['rejected', WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_REJECTED],
        ] as const)(
            'createWallet marks wallet removed when signTransaction returns %s',
            async (status, expectedReason) => {
                const serviceWithBlockdaemon = createService({
                    [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({
                        signTransactionResult: { status, txId: 'tx-1' },
                    }),
                })

                const result = await serviceWithBlockdaemon.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.BLOCKDAEMON
                )

                expect(result.status).toBe('removed')
                expect(result.disabled).toBe(true)
                expect(result.reason).toBe(expectedReason)
            }
        )

        it('throws when allocateParty wallet is missing topology metadata', async () => {
            const serviceWithBlockdaemon = createService({
                [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({}),
            })

            await expect(
                serviceWithBlockdaemon.allocateParty(
                    authContext,
                    createWallet('alice::fingerprint', {
                        signingProviderId: SigningProvider.BLOCKDAEMON,
                        topologyTransactions: 'tx1',
                        externalTxId: undefined,
                    }),
                    SigningProvider.BLOCKDAEMON
                )
            ).rejects.toThrow(
                'Existing wallet is missing field externalTxId or topologyTransactions'
            )
        })

        it('allocateParty updates wallet to allocated when transaction is signed', async () => {
            const serviceWithBlockdaemon = createService({
                [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'signed',
                        signature: 'sig-base64',
                    },
                }),
            })
            mockPartyAllocator.allocatePartyWithExistingWallet.mockResolvedValue(
                'alice::namespace'
            )

            await serviceWithBlockdaemon.allocateParty(
                authContext,
                createWallet('alice::fingerprint', {
                    signingProviderId: SigningProvider.BLOCKDAEMON,
                    namespace: 'fingerprint',
                    topologyTransactions: 'tx1',
                    externalTxId: 'tx-1',
                }),
                SigningProvider.BLOCKDAEMON
            )

            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                networkId: 'network1',
                partyId: 'alice::namespace',
                status: 'allocated',
                reason: '',
            })
        })

        it('allocateParty updates wallet to pending state', async () => {
            const serviceWithBlockdaemon = createService({
                [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({
                    getTransactionResult: { txId: 'tx-1', status: 'pending' },
                }),
            })

            await serviceWithBlockdaemon.allocateParty(
                authContext,
                createWallet('alice::fingerprint', {
                    signingProviderId: SigningProvider.BLOCKDAEMON,
                    topologyTransactions: 'tx1',
                    externalTxId: 'tx-1',
                }),
                SigningProvider.BLOCKDAEMON
            )

            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                partyId: 'alice::fingerprint',
                networkId: 'network1',
                status: 'initialized',
                reason: WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_PENDING,
            })
        })

        it('allocateParty disables wallet when transaction is rejected', async () => {
            const serviceWithBlockdaemon = createService({
                [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({
                    getTransactionResult: { txId: 'tx-1', status: 'rejected' },
                }),
            })

            await serviceWithBlockdaemon.allocateParty(
                authContext,
                createWallet('alice::fingerprint', {
                    signingProviderId: SigningProvider.BLOCKDAEMON,
                    topologyTransactions: 'tx1',
                    externalTxId: 'tx-1',
                }),
                SigningProvider.BLOCKDAEMON
            )

            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                partyId: 'alice::fingerprint',
                networkId: 'network1',
                status: 'removed',
                disabled: true,
                reason: WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_REJECTED,
            })
        })

        it('allocateParty disables wallet when transaction failed', async () => {
            const warnSpy = vi.spyOn(mockLogger, 'warn')
            const serviceWithBlockdaemon = createService({
                [SigningProvider.BLOCKDAEMON]: createBlockdaemonDriver({
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'failed',
                        metadata: { code: 'X' },
                    },
                }),
            })

            await serviceWithBlockdaemon.allocateParty(
                authContext,
                createWallet('alice::fingerprint', {
                    signingProviderId: SigningProvider.BLOCKDAEMON,
                    topologyTransactions: 'tx1',
                    externalTxId: 'tx-1',
                }),
                SigningProvider.BLOCKDAEMON
            )

            expect(warnSpy).toHaveBeenCalled()
            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                partyId: 'alice::fingerprint',
                networkId: 'network1',
                status: 'removed',
                disabled: true,
                reason: WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_FAILED,
            })
        })
    })

    describe('Dfns', () => {
        it('throws when Dfns signing driver not available', async () => {
            const serviceWithoutDfns = createService({})

            await expect(
                serviceWithoutDfns.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.DFNS
                )
            ).rejects.toThrow('Dfns signing driver not available')
        })

        it('createWallet returns initialized when signTransaction returns pending', async () => {
            const serviceWithDfns = createService({
                [SigningProvider.DFNS]: createDfnsDriver({
                    signTransactionResult: { status: 'pending', txId: 'tx-1' },
                    getTransactionResult: { status: 'pending', txId: 'tx-1' },
                }),
            })

            const result = await serviceWithDfns.createWallet(
                authContext,
                'alice',
                false,
                SigningProvider.DFNS
            )

            expect(result.status).toBe('initialized')
            expect(result.reason).toBe(
                WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_PENDING
            )
            expect(result.externalTxId).toBe('tx-1')
            expect(result.partyId).toBe('alice::fingerprint')
            expect(mockStore.addWallet).toHaveBeenCalled()
        })

        it('createWallet returns allocated when signTransaction returns signed', async () => {
            const serviceWithDfns = createService({
                [SigningProvider.DFNS]: createDfnsDriver({
                    createKeyResult: { id: 'key-1', publicKey: 'dfns-pk' },
                    signTransactionResult: { status: 'signed', txId: 'tx-1' },
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'signed',
                        signature: 'sig-base64',
                    },
                }),
            })
            mockPartyAllocator.allocatePartyWithExistingWallet.mockResolvedValue(
                'alice::namespace'
            )

            const result = await serviceWithDfns.createWallet(
                authContext,
                'alice',
                false,
                SigningProvider.DFNS
            )

            expect(result.status).toBe('allocated')
            expect(result.partyId).toBe('alice::namespace')
            expect(
                mockPartyAllocator.allocatePartyWithExistingWallet
            ).toHaveBeenCalled()
            expect(mockStore.addWallet).toHaveBeenCalled()
        })

        it.each([
            ['failed', WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_FAILED],
            ['rejected', WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_REJECTED],
        ] as const)(
            'createWallet returns status removed with reason when signTransaction returns %s',
            async (status, expectedReason) => {
                const serviceWithDfns = createService({
                    [SigningProvider.DFNS]: createDfnsDriver({
                        signTransactionResult: { status, txId: 'tx-1' },
                        getTransactionResult: { status, txId: 'tx-1' },
                    }),
                })

                const result = await serviceWithDfns.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.DFNS
                )

                expect(result.status).toBe('removed')
                expect(result.reason).toBe(expectedReason)
                expect(result.disabled).toBe(true)
                expect(mockStore.addWallet).toHaveBeenCalled()
            }
        )

        it('throws when createKey returns a signing error', async () => {
            const serviceWithDfns = createService({
                [SigningProvider.DFNS]: createDfnsDriver({
                    createKeyResult: {
                        error: 'denied',
                        error_description: 'Dfns key error',
                    },
                }),
            })

            await expect(
                serviceWithDfns.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.DFNS
                )
            ).rejects.toThrow('Error from signing driver: Dfns key error')
        })

        it('throws when a signed createWallet has no signature in getTransaction', async () => {
            const serviceWithDfns = createService({
                [SigningProvider.DFNS]: createDfnsDriver({
                    signTransactionResult: { status: 'signed', txId: 'tx-1' },
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'signed',
                    },
                }),
            })

            await expect(
                serviceWithDfns.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.DFNS
                )
            ).rejects.toThrow(
                'Transaction signed but no signature found in result'
            )
        })

        it('throws when allocateParty wallet is missing topology metadata', async () => {
            const serviceWithDfns = createService({
                [SigningProvider.DFNS]: createDfnsDriver({}),
            })

            await expect(
                serviceWithDfns.allocateParty(
                    authContext,
                    createWallet('alice::fingerprint', {
                        signingProviderId: SigningProvider.DFNS,
                        topologyTransactions: 'tx1',
                        externalTxId: undefined,
                    }),
                    SigningProvider.DFNS
                )
            ).rejects.toThrow(
                'Existing wallet is missing field externalTxId or topologyTransactions'
            )
        })

        it('allocateParty throws when signed transaction has no signature', async () => {
            const serviceWithDfns = createService({
                [SigningProvider.DFNS]: createDfnsDriver({
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'signed',
                    },
                }),
            })

            await expect(
                serviceWithDfns.allocateParty(
                    authContext,
                    createWallet('alice::fingerprint', {
                        signingProviderId: SigningProvider.DFNS,
                        topologyTransactions: 'tx1',
                        externalTxId: 'tx-1',
                    }),
                    SigningProvider.DFNS
                )
            ).rejects.toThrow(
                'Transaction signed but no signature found in result'
            )
        })

        it('allocateParty updates wallet to allocated when transaction is signed', async () => {
            const driver = createDfnsDriver({
                getTransactionResult: {
                    txId: 'tx-1',
                    status: 'signed',
                    signature: 'sig-base64',
                },
            })
            const serviceWithDfns = createService({
                [SigningProvider.DFNS]: driver,
            })
            mockPartyAllocator.allocatePartyWithExistingWallet.mockResolvedValue(
                'alice::namespace'
            )

            await serviceWithDfns.allocateParty(
                authContext,
                createWallet('alice::fingerprint', {
                    signingProviderId: SigningProvider.DFNS,
                    namespace: 'fingerprint',
                    topologyTransactions: 'tx1',
                    externalTxId: 'tx-1',
                }),
                SigningProvider.DFNS
            )

            expect(
                mockPartyAllocator.allocatePartyWithExistingWallet
            ).toHaveBeenCalledWith(
                'fingerprint',
                ['tx1'],
                'sig-base64',
                authContext.userId
            )
            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                networkId: 'network1',
                partyId: 'alice::namespace',
                status: 'allocated',
                reason: '',
            })
        })

        it('allocateParty updates wallet to initialized when transaction is pending', async () => {
            const serviceWithDfns = createService({
                [SigningProvider.DFNS]: createDfnsDriver({
                    getTransactionResult: { txId: 'tx-1', status: 'pending' },
                }),
            })

            await serviceWithDfns.allocateParty(
                authContext,
                createWallet('alice::fingerprint', {
                    signingProviderId: SigningProvider.DFNS,
                    topologyTransactions: 'tx1',
                    externalTxId: 'tx-1',
                }),
                SigningProvider.DFNS
            )

            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                partyId: 'alice::fingerprint',
                networkId: 'network1',
                status: 'initialized',
                reason: WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_PENDING,
            })
        })

        it.each([
            ['failed', WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_FAILED],
            ['rejected', WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_REJECTED],
        ] as const)(
            'allocateParty disables wallet when transaction is %s',
            async (status, expectedReason) => {
                const serviceWithDfns = createService({
                    [SigningProvider.DFNS]: createDfnsDriver({
                        getTransactionResult: {
                            txId: 'tx-1',
                            status,
                            metadata: { cause: 'test' },
                        },
                    }),
                })

                await serviceWithDfns.allocateParty(
                    authContext,
                    createWallet('alice::fingerprint', {
                        signingProviderId: SigningProvider.DFNS,
                        topologyTransactions: 'tx1',
                        externalTxId: 'tx-1',
                    }),
                    SigningProvider.DFNS
                )

                expect(mockStore.updateWallet).toHaveBeenCalledWith({
                    partyId: 'alice::fingerprint',
                    networkId: 'network1',
                    status: 'removed',
                    disabled: true,
                    reason: expectedReason,
                })
            }
        )
    })

    describe('Securosys', () => {
        it('throws when Securosys signing driver not available', async () => {
            const serviceWithoutSecurosys = createService({})

            await expect(
                serviceWithoutSecurosys.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.SECUROSYS
                )
            ).rejects.toThrow('Securosys signing driver not available')
        })

        it('createWallet returns initialized when signTransaction returns pending', async () => {
            const driver = createSecurosysDriver({
                createKeyResult: {
                    id: 'alice-key',
                    publicKey: 'securosys-pk',
                },
                signTransactionResult: {
                    status: 'pending',
                    txId: 'tsb-request-1',
                },
            })
            const serviceWithSecurosys = createService({
                [SigningProvider.SECUROSYS]: driver,
            })

            const result = await serviceWithSecurosys.createWallet(
                authContext,
                'alice',
                false,
                SigningProvider.SECUROSYS
            )

            const controller = vi.mocked(driver.controller).mock.results[0]
                ?.value as {
                createKey: Mock
                signTransaction: Mock
            }
            expect(controller.createKey).toHaveBeenCalledWith({
                name: 'alice',
            })
            expect(controller.signTransaction).toHaveBeenCalledWith(
                expect.objectContaining({
                    txHash: 'hash',
                    keyIdentifier: {
                        id: 'alice-key',
                        publicKey: 'securosys-pk',
                    },
                })
            )
            expect(result.status).toBe('initialized')
            expect(result.reason).toBe(
                WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_PENDING
            )
            expect(result.signingProviderId).toBe(SigningProvider.SECUROSYS)
            expect(result.externalTxId).toBe('tsb-request-1')
            expect(mockStore.addWallet).toHaveBeenCalled()
        })

        it('allocateParty updates wallet to allocated when transaction is signed', async () => {
            const serviceWithSecurosys = createService({
                [SigningProvider.SECUROSYS]: createSecurosysDriver({
                    getTransactionResult: {
                        txId: 'tsb-request-1',
                        status: 'signed',
                        signature: 'sig-base64',
                    },
                }),
            })
            mockPartyAllocator.allocatePartyWithExistingWallet.mockResolvedValue(
                'alice::namespace'
            )

            await serviceWithSecurosys.allocateParty(
                authContext,
                createWallet('alice::fingerprint', {
                    signingProviderId: SigningProvider.SECUROSYS,
                    namespace: 'fingerprint',
                    topologyTransactions: 'tx1',
                    externalTxId: 'tsb-request-1',
                }),
                SigningProvider.SECUROSYS
            )

            expect(
                mockPartyAllocator.allocatePartyWithExistingWallet
            ).toHaveBeenCalledWith(
                'fingerprint',
                ['tx1'],
                'sig-base64',
                authContext.userId
            )
            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                networkId: 'network1',
                partyId: 'alice::namespace',
                status: 'allocated',
                reason: '',
            })
        })
    })

    describe('BitGo', () => {
        it('throws when BitGo signing driver not available', async () => {
            const serviceWithoutBitGo = createService({})

            await expect(
                serviceWithoutBitGo.createWallet(
                    authContext,
                    'alice',
                    false,
                    SigningProvider.BITGO
                )
            ).rejects.toThrow('BitGo signing driver not available')
        })

        it('createWallet returns initialized when signTransaction returns pending', async () => {
            const serviceWithBitGo = createService({
                [SigningProvider.BITGO]: createDfnsDriver({
                    signTransactionResult: { status: 'pending', txId: 'tx-1' },
                    getTransactionResult: { status: 'pending', txId: 'tx-1' },
                }),
            })

            const result = await serviceWithBitGo.createWallet(
                authContext,
                'alice',
                false,
                SigningProvider.BITGO
            )

            expect(result.status).toBe('initialized')
            expect(result.reason).toBe(
                WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_PENDING
            )
            expect(result.externalTxId).toBe('tx-1')
            expect(result.partyId).toBe('alice::fingerprint')
            expect(mockStore.addWallet).toHaveBeenCalled()
        })

        it('createWallet returns allocated when signTransaction returns signed', async () => {
            const serviceWithBitGo = createService({
                [SigningProvider.BITGO]: createDfnsDriver({
                    createKeyResult: { id: 'key-1', publicKey: 'bitgo-pk' },
                    signTransactionResult: { status: 'signed', txId: 'tx-1' },
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'signed',
                        signature: 'sig-base64',
                    },
                }),
            })
            mockPartyAllocator.allocatePartyWithExistingWallet.mockResolvedValue(
                'alice::namespace'
            )

            const result = await serviceWithBitGo.createWallet(
                authContext,
                'alice',
                false,
                SigningProvider.BITGO
            )

            expect(result.status).toBe('allocated')
            expect(result.partyId).toBe('alice::namespace')
            expect(
                mockPartyAllocator.allocatePartyWithExistingWallet
            ).toHaveBeenCalled()
            expect(mockStore.addWallet).toHaveBeenCalled()
        })

        it('allocateParty updates wallet to allocated when transaction is signed', async () => {
            const serviceWithBitGo = createService({
                [SigningProvider.BITGO]: createDfnsDriver({
                    getTransactionResult: {
                        txId: 'tx-1',
                        status: 'signed',
                        signature: 'sig-base64',
                    },
                }),
            })
            mockPartyAllocator.allocatePartyWithExistingWallet.mockResolvedValue(
                'alice::namespace'
            )

            await serviceWithBitGo.allocateParty(
                authContext,
                createWallet('alice::fingerprint', {
                    signingProviderId: SigningProvider.BITGO,
                    namespace: 'fingerprint',
                    topologyTransactions: 'tx1',
                    externalTxId: 'tx-1',
                }),
                SigningProvider.BITGO
            )

            expect(
                mockPartyAllocator.allocatePartyWithExistingWallet
            ).toHaveBeenCalledWith(
                'fingerprint',
                ['tx1'],
                'sig-base64',
                authContext.userId
            )
            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                networkId: 'network1',
                partyId: 'alice::namespace',
                status: 'allocated',
                reason: '',
            })
        })

        it('allocateParty updates wallet to initialized when transaction is pending', async () => {
            const serviceWithBitGo = createService({
                [SigningProvider.BITGO]: createDfnsDriver({
                    getTransactionResult: { txId: 'tx-1', status: 'pending' },
                }),
            })

            await serviceWithBitGo.allocateParty(
                authContext,
                createWallet('alice::fingerprint', {
                    signingProviderId: SigningProvider.BITGO,
                    topologyTransactions: 'tx1',
                    externalTxId: 'tx-1',
                }),
                SigningProvider.BITGO
            )

            expect(mockStore.updateWallet).toHaveBeenCalledWith({
                partyId: 'alice::fingerprint',
                networkId: 'network1',
                status: 'initialized',
                reason: WALLET_DISABLED_REASON.TOPOLOGY_TRANSACTION_PENDING,
            })
        })
    })
})
