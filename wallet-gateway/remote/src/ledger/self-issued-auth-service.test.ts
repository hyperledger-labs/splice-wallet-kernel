// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pino } from 'pino'
import { sink } from 'pino-test'
import { SigningProvider } from '@canton-network/core-signing-lib'
import type { LedgerClient } from '@canton-network/core-ledger-client'
import {
    PartyLevelRight,
    type Store,
    type Wallet,
} from '@canton-network/core-wallet-store'
import type { SigningDrivers } from '@canton-network/core-wallet-services'
import type { WalletAllocationService } from './wallet-allocation/wallet-allocation-service.js'
import { SelfIssuedAuthService } from './self-issued-auth-service'

const { probeGet, syncRights } = vi.hoisted(() => ({
    probeGet: vi.fn(),
    syncRights: vi.fn().mockResolvedValue([]),
}))

vi.mock('./wallet-sync-service.js', () => ({
    WalletSyncService: vi.fn(function WalletSyncServiceMock() {
        return { syncRights }
    }),
}))

vi.mock('@canton-network/core-ledger-client', async (importOriginal) => {
    const actual =
        await importOriginal<
            typeof import('@canton-network/core-ledger-client')
        >()
    return {
        ...actual,
        LedgerClient: class {
            get = probeGet
        },
    }
})

const publicKey = Buffer.alloc(32, 1).toString('base64')

const createWallet = (overrides: Partial<Wallet> = {}): Wallet => ({
    primary: true,
    partyId: 'alice::ns',
    status: 'initialized',
    hint: 'alice',
    signingProviderId: SigningProvider.WALLET_KERNEL,
    publicKey,
    namespace: 'ns',
    networkId: 'network-1',
    userId: 'alice',
    rights: [],
    ...overrides,
})

const network = {
    id: 'network-1',
    synchronizerId: 'global-domain::fingerprint',
    ledgerApi: { baseUrl: 'http://ledger.example' },
    auth: {
        method: 'self_issued' as const,
        audience: 'participant-aud',
        scope: 'daml_ledger_api',
    },
}

describe('SelfIssuedAuthService', () => {
    const logger = pino(sink())
    let store: {
        getWallet: ReturnType<typeof vi.fn>
        getWallets: ReturnType<typeof vi.fn>
        updateWallet: ReturnType<typeof vi.fn>
        getCurrentNetwork: ReturnType<typeof vi.fn>
        upgradeOnboardingSession: ReturnType<typeof vi.fn>
    }
    let signMessage: ReturnType<typeof vi.fn>
    let walletAllocator: {
        createWallet: ReturnType<typeof vi.fn>
        allocateParty: ReturnType<typeof vi.fn>
    }
    let ledgerClient: {
        get: ReturnType<typeof vi.fn>
        post: ReturnType<typeof vi.fn>
        patch: ReturnType<typeof vi.fn>
    }

    beforeEach(() => {
        signMessage = vi.fn().mockResolvedValue({
            signature: Buffer.from('sig-bytes').toString('base64'),
        })
        probeGet.mockResolvedValue({ userId: 'alice' })
        syncRights.mockReset()
        syncRights.mockResolvedValue([])
        store = {
            getWallet: vi.fn(),
            getWallets: vi.fn().mockResolvedValue([]),
            updateWallet: vi.fn().mockResolvedValue(undefined),
            getCurrentNetwork: vi.fn().mockResolvedValue(network),
            upgradeOnboardingSession: vi
                .fn()
                .mockImplementation(
                    async (id: string, accessToken: string) => ({
                        id,
                        origin: 'https://app.example',
                        network: 'network-1',
                        userId: 'alice',
                        accessToken,
                    })
                ),
        }
        walletAllocator = {
            createWallet: vi.fn(),
            allocateParty: vi.fn().mockResolvedValue(undefined),
        }
        ledgerClient = {
            get: vi.fn().mockResolvedValue({}),
            post: vi.fn().mockResolvedValue({ user: { id: 'alice' } }),
            patch: vi.fn().mockResolvedValue({ user: { id: 'alice' } }),
        }
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    function createService() {
        const driver = { controller: () => ({ signMessage }) }
        const drivers = {
            [SigningProvider.WALLET_KERNEL]: driver,
            [SigningProvider.FIREBLOCKS]: driver,
        } as unknown as SigningDrivers
        return new SelfIssuedAuthService(
            { userId: 'alice', sessionId: 'onboarding-session' },
            store as unknown as Store,
            logger,
            walletAllocator as unknown as WalletAllocationService,
            ledgerClient as unknown as LedgerClient,
            drivers
        )
    }

    describe('getOnboardingState', () => {
        it('reports an onboarded ledger user and auth-party wallets only', async () => {
            const authWallet = createWallet({ isAuthParty: true })
            const otherWallet = createWallet({
                partyId: 'bob::ns',
                hint: 'bob',
                isAuthParty: false,
            })
            ledgerClient.get.mockResolvedValue({
                user: {
                    id: 'alice',
                    primaryParty: authWallet.partyId,
                    primaryPartyAuthentication: true,
                },
            })
            store.getWallets.mockResolvedValue([authWallet, otherWallet])

            await expect(createService().getOnboardingState()).resolves.toEqual(
                {
                    userExists: true,
                    primaryPartyAuth: true,
                    wallets: [authWallet],
                }
            )
        })

        it('reports an existing ledger user that is not an authentication party', async () => {
            ledgerClient.get.mockResolvedValue({ user: { id: 'alice' } })

            await expect(createService().getOnboardingState()).resolves.toEqual(
                {
                    userExists: true,
                    primaryPartyAuth: false,
                    wallets: [],
                }
            )
        })

        it('reports primary party without the authentication flag not primaryPartyAuth', async () => {
            ledgerClient.get.mockResolvedValue({
                user: { id: 'alice', primaryParty: 'alice::ns' },
            })

            await expect(createService().getOnboardingState()).resolves.toEqual(
                {
                    userExists: true,
                    primaryPartyAuth: false,
                    wallets: [],
                }
            )
        })

        it('treats USER_NOT_FOUND as a missing ledger user', async () => {
            ledgerClient.get.mockRejectedValue({
                code: 'USER_NOT_FOUND',
                cause: 'getting user failed for unknown user "bubu"',
                errorCategory: 11,
            })

            await expect(createService().getOnboardingState()).resolves.toEqual(
                {
                    userExists: false,
                    primaryPartyAuth: false,
                    wallets: [],
                }
            )
        })

        it('propagates non–USER_NOT_FOUND ledger errors', async () => {
            const permissionDenied = {
                code: 'PERMISSION_DENIED',
                cause: 'not allowed',
                errorCategory: 7,
            }
            ledgerClient.get.mockRejectedValue(permissionDenied)

            await expect(createService().getOnboardingState()).rejects.toEqual(
                permissionDenied
            )
        })
    })

    describe('createWallet', () => {
        it('creates a ledger user and a wallet signing request', async () => {
            const pendingWallet = createWallet()
            walletAllocator.createWallet.mockResolvedValue(pendingWallet)

            const wallet = await createService().createWallet({
                partyHint: 'my-party',
                signingProviderId: SigningProvider.WALLET_KERNEL,
            })

            expect(ledgerClient.get).toHaveBeenCalledWith(
                '/v2/users/{user-id}',
                { path: { 'user-id': 'alice' } }
            )
            expect(ledgerClient.post).toHaveBeenCalledWith('/v2/users', {
                user: {
                    id: 'alice',
                    isDeactivated: false,
                    identityProviderId: '',
                },
                rights: [],
            })
            expect(walletAllocator.createWallet).toHaveBeenCalledWith(
                {
                    userId: 'alice',
                    accessToken: '',
                    sessionId: 'onboarding-session',
                },
                'my-party',
                false,
                SigningProvider.WALLET_KERNEL
            )
            expect(wallet).toEqual(pendingWallet)
            expect(ledgerClient.patch).not.toHaveBeenCalled()
            expect(syncRights).not.toHaveBeenCalled()
        })

        it('continues an interrupted onboarding for a user without a primary party', async () => {
            const pendingWallet = createWallet()
            ledgerClient.get.mockResolvedValue({ user: { id: 'alice' } })
            walletAllocator.createWallet.mockResolvedValue(pendingWallet)

            const wallet = await createService().createWallet({
                partyHint: 'my-party',
                signingProviderId: SigningProvider.WALLET_KERNEL,
            })

            expect(ledgerClient.post).not.toHaveBeenCalled()
            expect(walletAllocator.createWallet).toHaveBeenCalled()
            expect(wallet).toEqual(pendingWallet)
            expect(syncRights).not.toHaveBeenCalled()
        })

        it('syncs rights when the created wallet is allocated', async () => {
            const allocatedWallet = createWallet({ status: 'allocated' })
            const walletWithRights = createWallet({
                status: 'allocated',
                rights: [PartyLevelRight.CanActAs],
            })
            walletAllocator.createWallet.mockResolvedValue(allocatedWallet)
            store.getWallet.mockResolvedValue(walletWithRights)

            const wallet = await createService().createWallet({
                partyHint: 'my-party',
                signingProviderId: SigningProvider.WALLET_KERNEL,
            })

            expect(syncRights).toHaveBeenCalledOnce()
            expect(wallet).toEqual(walletWithRights)
        })

        it('rejects when primary party authentication is already configured', async () => {
            ledgerClient.get.mockResolvedValue({
                user: {
                    id: 'alice',
                    primaryParty: 'alice::ns',
                    primaryPartyAuthentication: true,
                },
            })

            await expect(
                createService().createWallet({
                    partyHint: 'my-party',
                    signingProviderId: SigningProvider.WALLET_KERNEL,
                })
            ).rejects.toThrow(
                'Primary party authentication is already configured for this user.'
            )
            expect(ledgerClient.post).not.toHaveBeenCalled()
            expect(walletAllocator.createWallet).not.toHaveBeenCalled()
        })

        it.each([
            [
                'only primary party authentication',
                { primaryPartyAuthentication: true },
            ],
            ['only a primary party', { primaryParty: 'alice::ns' }],
        ])(
            'allows createWallet when the ledger user has %s',
            async (_, userFields) => {
                const pendingWallet = createWallet()
                ledgerClient.get.mockResolvedValue({
                    user: { id: 'alice', ...userFields },
                })
                walletAllocator.createWallet.mockResolvedValue(pendingWallet)

                await expect(
                    createService().createWallet({
                        partyHint: 'my-party',
                        signingProviderId: SigningProvider.WALLET_KERNEL,
                    })
                ).resolves.toEqual(pendingWallet)
            }
        )

        it('rejects participant onboarding', async () => {
            await expect(
                createService().createWallet({
                    partyHint: 'my-party',
                    signingProviderId: SigningProvider.PARTICIPANT,
                })
            ).rejects.toThrow(
                'Signing provider participant is not supported for self-issued onboarding'
            )
            expect(walletAllocator.createWallet).not.toHaveBeenCalled()
        })

        it('rejects an empty party hint', async () => {
            await expect(
                createService().createWallet({
                    partyHint: '  ',
                    signingProviderId: SigningProvider.WALLET_KERNEL,
                })
            ).rejects.toThrow('partyHint is required')
        })
    })

    describe('allocateParty and connectSession', () => {
        it('polls the signing provider, allocates the party, and patches the ledger user', async () => {
            const pendingWallet = createWallet({
                signingProviderId: SigningProvider.FIREBLOCKS,
            })
            const allocatedWallet = createWallet({
                status: 'allocated',
                signingProviderId: SigningProvider.FIREBLOCKS,
            })
            const authPartyWallet = createWallet({
                status: 'allocated',
                signingProviderId: SigningProvider.FIREBLOCKS,
                isAuthParty: true,
            })
            store.getWallet
                .mockResolvedValueOnce(pendingWallet)
                .mockResolvedValueOnce(allocatedWallet)
                .mockResolvedValueOnce(allocatedWallet)
                .mockResolvedValueOnce(allocatedWallet)
                .mockResolvedValueOnce(authPartyWallet)

            const service = createService()
            await service.allocateParty({
                partyId: pendingWallet.partyId,
            })
            const { wallet, accessToken, session } =
                await service.connectSession({
                    partyId: pendingWallet.partyId,
                })

            expect(syncRights).toHaveBeenCalledOnce()
            expect(walletAllocator.allocateParty).toHaveBeenCalledWith(
                {
                    userId: 'alice',
                    accessToken: '',
                    sessionId: 'onboarding-session',
                },
                pendingWallet,
                SigningProvider.FIREBLOCKS
            )
            expect(ledgerClient.patch).toHaveBeenCalledWith(
                '/v2/users/{user-id}',
                {
                    user: {
                        id: 'alice',
                        primaryParty: allocatedWallet.partyId,
                        primaryPartyAuthentication: true,
                    },
                    updateMask: {
                        paths: [
                            'primary_party',
                            'primary_party_authentication',
                        ],
                        unknownFields: { fields: {} },
                    },
                },
                { path: { 'user-id': 'alice' } }
            )
            expect(store.updateWallet).toHaveBeenCalledWith({
                partyId: allocatedWallet.partyId,
                networkId: allocatedWallet.networkId,
                isAuthParty: true,
            })
            expect(wallet.status).toBe('allocated')
            expect(wallet.isAuthParty).toBe(true)
            expect(store.upgradeOnboardingSession).toHaveBeenCalledWith(
                'onboarding-session',
                accessToken
            )
            expect(session.id).toBe('onboarding-session')
        })

        it('patches the ledger user when the wallet is already allocated', async () => {
            const allocatedWallet = createWallet({ status: 'allocated' })
            const authPartyWallet = createWallet({
                status: 'allocated',
                isAuthParty: true,
            })
            store.getWallet
                .mockResolvedValueOnce(allocatedWallet)
                .mockResolvedValueOnce(authPartyWallet)

            const wallet = (
                await createService().connectSession({
                    partyId: allocatedWallet.partyId,
                })
            ).wallet

            expect(walletAllocator.allocateParty).not.toHaveBeenCalled()
            expect(ledgerClient.patch).toHaveBeenCalled()
            expect(store.updateWallet).toHaveBeenCalledWith({
                partyId: allocatedWallet.partyId,
                networkId: allocatedWallet.networkId,
                isAuthParty: true,
            })
            expect(wallet.isAuthParty).toBe(true)
            expect(probeGet).toHaveBeenCalledWith('/v2/authenticated-user')
            const signingInput = signMessage.mock.calls[0][0].message as string
            const payload = JSON.parse(
                Buffer.from(signingInput.split('.')[1], 'base64url').toString()
            )
            expect(payload).toMatchObject({
                aud: 'participant-aud',
                scope: 'daml_ledger_api',
                iss: allocatedWallet.partyId,
                sub: allocatedWallet.partyId,
                'daml.com': {
                    syn: network.synchronizerId,
                    usr: 'alice',
                },
            })
            expect(payload.exp).toBe(Math.floor(Date.now() / 1000) + 10 * 60)
            expect(store.upgradeOnboardingSession).toHaveBeenCalledOnce()
        })

        it('connects an existing auth party without changing the ledger user', async () => {
            const authPartyWallet = createWallet({
                status: 'allocated',
                isAuthParty: true,
            })
            ledgerClient.get.mockResolvedValue({
                user: {
                    id: 'alice',
                    primaryParty: authPartyWallet.partyId,
                    primaryPartyAuthentication: true,
                },
            })
            store.getWallet.mockResolvedValue(authPartyWallet)

            const { wallet } = await createService().connectSession({
                partyId: authPartyWallet.partyId,
            })

            expect(wallet).toEqual(authPartyWallet)
            expect(ledgerClient.patch).not.toHaveBeenCalled()
            expect(store.updateWallet).not.toHaveBeenCalled()
            expect(signMessage).toHaveBeenCalledOnce()
            expect(store.upgradeOnboardingSession).toHaveBeenCalledOnce()
        })

        it.each([
            [
                'not marked as the auth party',
                createWallet({ status: 'allocated' }),
            ],
            [
                'a different party',
                createWallet({
                    status: 'allocated',
                    partyId: 'other::ns',
                    isAuthParty: true,
                }),
            ],
        ])('rejects connecting %s for an onboarded user', async (_, wallet) => {
            ledgerClient.get.mockResolvedValue({
                user: {
                    id: 'alice',
                    primaryParty: 'alice::ns',
                    primaryPartyAuthentication: true,
                },
            })
            store.getWallet.mockResolvedValue(wallet)

            await expect(
                createService().connectSession({ partyId: wallet.partyId })
            ).rejects.toThrow(
                `Party ${wallet.partyId} is not the authentication party for this user`
            )
            expect(ledgerClient.patch).not.toHaveBeenCalled()
            expect(signMessage).not.toHaveBeenCalled()
            expect(store.upgradeOnboardingSession).not.toHaveBeenCalled()
        })

        it('keeps the tokenless session when the participant rejects the token', async () => {
            const allocatedWallet = createWallet({ status: 'allocated' })
            store.getWallet
                .mockResolvedValueOnce(allocatedWallet)
                .mockResolvedValueOnce(
                    createWallet({ status: 'allocated', isAuthParty: true })
                )
            probeGet.mockRejectedValue(new Error('UNAUTHENTICATED'))

            await expect(
                createService().connectSession({
                    partyId: allocatedWallet.partyId,
                })
            ).rejects.toThrow(
                'Self-issued token was rejected by the participant'
            )
            expect(store.upgradeOnboardingSession).not.toHaveBeenCalled()
        })

        it('syncs rights when allocateParty finds the wallet already allocated', async () => {
            const allocatedWallet = createWallet({ status: 'allocated' })
            const walletWithRights = createWallet({
                status: 'allocated',
                rights: [PartyLevelRight.CanActAs],
            })
            store.getWallet
                .mockResolvedValueOnce(allocatedWallet)
                .mockResolvedValueOnce(walletWithRights)

            const wallet = await createService().allocateParty({
                partyId: allocatedWallet.partyId,
            })

            expect(walletAllocator.allocateParty).not.toHaveBeenCalled()
            expect(syncRights).toHaveBeenCalledOnce()
            expect(wallet).toEqual(walletWithRights)
        })

        it('does not patch the ledger user when allocateParty leaves the wallet unallocated', async () => {
            store.getWallet.mockResolvedValue(createWallet())

            const wallet = await createService().allocateParty({
                partyId: 'alice::ns',
            })

            expect(walletAllocator.allocateParty).toHaveBeenCalled()
            // Signing is still pending, so there are no party rights to copy yet.
            expect(syncRights).not.toHaveBeenCalled()
            expect(ledgerClient.patch).not.toHaveBeenCalled()
            expect(store.updateWallet).not.toHaveBeenCalled()
            expect(wallet.status).toBe('initialized')
            expect(signMessage).not.toHaveBeenCalled()
            expect(store.upgradeOnboardingSession).not.toHaveBeenCalled()
        })

        it('throws when the wallet is missing', async () => {
            store.getWallet.mockResolvedValue(null)

            await expect(
                createService().allocateParty({
                    partyId: 'missing::ns',
                })
            ).rejects.toThrow('Wallet not found for party missing::ns')
        })
    })
})
