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
import {
    SELF_ISSUED_LOGIN_UNAVAILABLE,
    SelfIssuedAuthService,
} from './self-issued-auth-service'
import type { PartyAllocationService } from './party-allocation-service.js'

const { probeGet, syncRights, syncAuthParty } = vi.hoisted(() => ({
    probeGet: vi.fn(),
    syncRights: vi.fn().mockResolvedValue([]),
    syncAuthParty: vi.fn(),
}))

vi.mock('./wallet-sync-service.js', () => ({
    WalletSyncService: vi.fn(function WalletSyncServiceMock() {
        return { syncRights, syncAuthParty }
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
        upgradeSelfIssuedLoginSession: ReturnType<typeof vi.fn>
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
        syncAuthParty.mockReset()
        store = {
            getWallet: vi.fn(),
            getWallets: vi.fn().mockResolvedValue([]),
            updateWallet: vi.fn().mockResolvedValue(undefined),
            getCurrentNetwork: vi.fn().mockResolvedValue(network),
            upgradeSelfIssuedLoginSession: vi
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
            drivers,
            {} as PartyAllocationService
        )
    }

    describe('getLoginMode', () => {
        it('returns create mode and does not discover a wallet when there is no ledger user', async () => {
            ledgerClient.get.mockRejectedValue({
                code: 'USER_NOT_FOUND',
                cause: 'getting user failed for unknown user "bob"',
                errorCategory: 11,
            })

            await expect(createService().getLoginMode()).resolves.toEqual({
                mode: 'create',
            })
            expect(syncAuthParty).not.toHaveBeenCalled()
        })

        it.each([
            ['no primary party', { id: 'alice' }],
            [
                'primary-party authentication turned off',
                { id: 'alice', primaryParty: 'alice::ns' },
            ],
            [
                'an external identity provider',
                {
                    id: 'alice',
                    primaryParty: 'alice::ns',
                    primaryPartyAuthentication: true,
                    identityProviderId: 'external-idp',
                },
            ],
        ])(
            'throws and does not discover a wallet when the user has %s',
            async (_, user) => {
                ledgerClient.get.mockResolvedValue({ user })

                await expect(createService().getLoginMode()).rejects.toThrow(
                    SELF_ISSUED_LOGIN_UNAVAILABLE
                )
                expect(syncAuthParty).not.toHaveBeenCalled()
            }
        )

        it('returns select mode with the wallet when the primary party is allocated and enabled', async () => {
            const authWallet = createWallet({
                status: 'allocated',
                isAuthParty: true,
            })
            ledgerClient.get.mockResolvedValue({
                user: {
                    id: 'alice',
                    primaryParty: authWallet.partyId,
                    primaryPartyAuthentication: true,
                },
            })
            syncAuthParty.mockResolvedValue(authWallet)

            await expect(createService().getLoginMode()).resolves.toEqual({
                mode: 'select',
                wallet: authWallet,
            })
            expect(syncAuthParty).toHaveBeenCalledWith(authWallet.partyId)
        })

        it.each([
            ['discovery finds no wallet', undefined],
            [
                'the wallet is still waiting for allocation',
                createWallet({ status: 'initialized' }),
            ],
            [
                'the wallet is disabled',
                createWallet({
                    status: 'allocated',
                    disabled: true,
                    isAuthParty: true,
                }),
            ],
        ])(
            'returns select mode without a wallet when %s',
            async (_, wallet) => {
                ledgerClient.get.mockResolvedValue({
                    user: {
                        id: 'alice',
                        primaryParty: 'alice::ns',
                        primaryPartyAuthentication: true,
                    },
                })
                syncAuthParty.mockResolvedValue(wallet)

                await expect(createService().getLoginMode()).resolves.toEqual({
                    mode: 'select',
                    wallet: undefined,
                })
            }
        )

        it('propagates ledger errors other than a missing user', async () => {
            const permissionDenied = {
                code: 'PERMISSION_DENIED',
                cause: 'not allowed',
                errorCategory: 7,
            }
            ledgerClient.get.mockRejectedValue(permissionDenied)

            await expect(createService().getLoginMode()).rejects.toEqual(
                permissionDenied
            )
            expect(syncAuthParty).not.toHaveBeenCalled()
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

    describe('allocateParty', () => {
        it('polls a pending wallet and syncs rights once it is allocated', async () => {
            const pendingWallet = createWallet({
                signingProviderId: SigningProvider.FIREBLOCKS,
            })
            const allocatedWallet = createWallet({
                status: 'allocated',
                signingProviderId: SigningProvider.FIREBLOCKS,
            })
            const walletWithRights = createWallet({
                status: 'allocated',
                signingProviderId: SigningProvider.FIREBLOCKS,
                rights: [PartyLevelRight.CanActAs],
            })
            store.getWallet
                .mockResolvedValueOnce(pendingWallet)
                .mockResolvedValueOnce(allocatedWallet)
                .mockResolvedValueOnce(walletWithRights)

            const wallet = await createService().allocateParty(
                pendingWallet.partyId
            )

            expect(walletAllocator.allocateParty).toHaveBeenCalledWith(
                {
                    userId: 'alice',
                    accessToken: '',
                    sessionId: 'onboarding-session',
                },
                pendingWallet,
                SigningProvider.FIREBLOCKS
            )
            expect(syncRights).toHaveBeenCalledOnce()
            expect(wallet).toEqual(walletWithRights)
        })

        it('syncs rights when the wallet is already allocated', async () => {
            const allocatedWallet = createWallet({ status: 'allocated' })
            const walletWithRights = createWallet({
                status: 'allocated',
                rights: [PartyLevelRight.CanActAs],
            })
            store.getWallet
                .mockResolvedValueOnce(allocatedWallet)
                .mockResolvedValueOnce(walletWithRights)

            const wallet = await createService().allocateParty(
                allocatedWallet.partyId
            )

            expect(walletAllocator.allocateParty).not.toHaveBeenCalled()
            expect(syncRights).toHaveBeenCalledOnce()
            expect(wallet).toEqual(walletWithRights)
        })

        it('does not sync rights when signing is still pending', async () => {
            store.getWallet.mockResolvedValue(createWallet())

            const wallet = await createService().allocateParty('alice::ns')

            expect(walletAllocator.allocateParty).toHaveBeenCalled()
            expect(syncRights).not.toHaveBeenCalled()
            expect(wallet.status).toBe('initialized')
        })

        it('throws when the wallet is missing', async () => {
            store.getWallet.mockResolvedValue(null)

            await expect(
                createService().allocateParty('missing::ns')
            ).rejects.toThrow('Wallet not found for party missing::ns')
        })
    })

    describe('completeLogin', () => {
        it('patches the ledger user and upgrades the tokenless session', async () => {
            const allocatedWallet = createWallet({ status: 'allocated' })
            const authPartyWallet = createWallet({
                status: 'allocated',
                isAuthParty: true,
            })
            store.getWallet
                .mockResolvedValueOnce(allocatedWallet)
                .mockResolvedValueOnce(authPartyWallet)

            const { wallet, accessToken, session } =
                await createService().completeLogin(allocatedWallet.partyId)

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
            expect(wallet).toEqual(authPartyWallet)
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
            expect(store.upgradeSelfIssuedLoginSession).toHaveBeenCalledWith(
                'onboarding-session',
                accessToken
            )
            expect(session.id).toBe('onboarding-session')
        })

        it('logs in an existing auth party without changing the ledger user', async () => {
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

            const { wallet } = await createService().completeLogin(
                authPartyWallet.partyId
            )

            expect(wallet).toEqual(authPartyWallet)
            expect(ledgerClient.patch).not.toHaveBeenCalled()
            expect(store.updateWallet).not.toHaveBeenCalled()
            expect(signMessage).toHaveBeenCalledOnce()
            expect(store.upgradeSelfIssuedLoginSession).toHaveBeenCalledOnce()
        })

        it.each([
            [
                'not marked as the auth party',
                createWallet({ status: 'allocated', isAuthParty: false }),
            ],
            [
                'a different party',
                createWallet({
                    status: 'allocated',
                    partyId: 'other::ns',
                    isAuthParty: true,
                }),
            ],
        ])(
            'rejects a wallet that is %s when the user is already authenticated',
            async (_, wallet) => {
                ledgerClient.get.mockResolvedValue({
                    user: {
                        id: 'alice',
                        primaryParty: 'alice::ns',
                        primaryPartyAuthentication: true,
                    },
                })
                store.getWallet.mockResolvedValue(wallet)

                await expect(
                    createService().completeLogin(wallet.partyId)
                ).rejects.toThrow(
                    `Party ${wallet.partyId} is not the authentication party for this user`
                )
                expect(ledgerClient.patch).not.toHaveBeenCalled()
                expect(signMessage).not.toHaveBeenCalled()
                expect(
                    store.upgradeSelfIssuedLoginSession
                ).not.toHaveBeenCalled()
            }
        )

        it('throws when rejects the token', async () => {
            const allocatedWallet = createWallet({ status: 'allocated' })
            store.getWallet
                .mockResolvedValueOnce(allocatedWallet)
                .mockResolvedValueOnce(
                    createWallet({ status: 'allocated', isAuthParty: true })
                )
            probeGet.mockRejectedValue(new Error('UNAUTHENTICATED'))

            await expect(
                createService().completeLogin(allocatedWallet.partyId)
            ).rejects.toThrow(
                'Self-issued token was rejected by the participant'
            )
            expect(store.upgradeSelfIssuedLoginSession).not.toHaveBeenCalled()
        })
    })
})
