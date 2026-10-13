// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, test } from 'vitest'

import { StoreInternal, type StoreInternalConfig } from './store-internal'
import {
    type Wallet,
    type Session,
    type Store,
    type LedgerApi,
    type Network,
    type Transaction,
    type MessageRaw,
    UserLevelRight,
    PartyLevelRight,
    type ApiKey,
} from '@canton-network/core-wallet-store'
import type {
    AuthContext,
    AuthorizationCodeAuth,
    Idp,
} from '@canton-network/core-wallet-auth'
import { getLogger, type Logger } from '@logtape/logtape'

const authContextMock: AuthContext = {
    userId: 'test-user-id',
    accessToken: 'test-access-token',
}

const oauthIdp = (): Idp => ({
    id: 'idp1',
    type: 'oauth',
    issuer: 'http://auth',
    configUrl: 'http://auth/.well-known/openid-configuration',
})

const selfIssuedIdp = (): Idp => ({
    id: 'idp-self-issued',
    type: 'self_issued',
})

const baseNetwork = (id = 'network1'): Network => ({
    id,
    name: `net-${id}`,
    synchronizerId: 'sync1::fingerprint',
    description: 'Test Network',
    identityProviderId: 'idp1',
    ledgerApi: { baseUrl: 'http://api' },
    auth: {
        method: 'authorization_code',
        clientId: 'cid',
        scope: 'scope',
        audience: 'aud',
    },
})

const selfIssuedNetwork = (id: string, audience: string): Network => ({
    id,
    name: `self-issued-${id}`,
    synchronizerId: 'sync1::fingerprint',
    description: `Self-issued ${id}`,
    identityProviderId: 'idp-self-issued',
    ledgerApi: { baseUrl: 'http://api' },
    auth: {
        method: 'self_issued',
        audience,
        scope: 'daml_ledger_api',
    },
})

const baseWallet = (
    partyId: string,
    networkId = 'network1',
    overrides: Partial<Wallet> = {}
): Wallet => ({
    primary: false,
    userId: authContextMock.userId,
    partyId,
    status: 'allocated',
    hint: partyId,
    signingProviderId: 'internal',
    publicKey: 'publicKey',
    namespace: 'namespace',
    rights: [PartyLevelRight.CanActAs],
    networkId,
    ...overrides,
})

type StoreCtor = new (
    config: StoreInternalConfig,
    logger: Logger,
    authContext?: AuthContext,
    userStorage?: Map<string, ReturnType<typeof StoreInternal.createStorage>>
) => Store

const implementations: Array<[string, StoreCtor]> = [
    ['StoreInternal', StoreInternal],
]

function addTx(id: string, createdAt: Date | undefined) {
    const initial: Transaction = {
        id: id,
        commandId: 'cmd-immutable',
        status: 'pending',
        preparedTransaction: 'prepared-1',
        preparedTransactionHash: 'hash-1',
        payload: { amount: 100 },
        origin: 'https://safe.example',
        ...(createdAt ? { createdAt } : {}),
    }
    return initial
}
implementations.forEach(([name, StoreImpl]) => {
    describe(name, () => {
        let store: Store

        beforeEach(() => {
            // Create a fresh config for each test to avoid shared state between tests
            const storeConfig: StoreInternalConfig = {
                idps: [],
                networks: [],
            }
            store = new StoreImpl(
                storeConfig,
                getLogger('mock'),
                authContextMock
            )
        })

        test('should add and retrieve wallets', async () => {
            const idp: Idp = {
                id: 'idp1',
                type: 'oauth' as const,
                issuer: 'http://auth',
                configUrl: 'http://auth/.well-known/openid-configuration',
            }
            const network: Network = {
                id: 'network1',
                name: 'testnet',
                synchronizerId: 'sync1::fingerprint',
                description: 'Test Network',
                identityProviderId: 'idp1',
                ledgerApi: { baseUrl: 'http://api' },
                auth: {
                    method: 'authorization_code',
                    clientId: 'cid',
                    scope: 'scope',
                    audience: 'aud',
                },
            }
            const session: Session = {
                id: 'session1',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            }
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession(session)

            const wallet: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party1',
                status: 'allocated',
                hint: 'hint',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
                rights: [PartyLevelRight.CanActAs],
            }
            await store.addWallet(wallet)
            const wallets = await store.getWallets()
            expect(wallets).toHaveLength(1)
            expect(await store.getWallet('party1')).toMatchObject({
                partyId: 'party1',
                networkId: 'network1',
            })
            expect(await store.getWallet('missing')).toBeNull()
        })

        test('should look up a wallet by self-issued JWT claims without a session', async () => {
            await store.addIdp(selfIssuedIdp())
            await store.addNetwork(
                selfIssuedNetwork('network-self-issued', 'self-issued-aud')
            )

            const wallet: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party1',
                status: 'allocated',
                hint: 'hint',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network-self-issued',
                rights: [PartyLevelRight.CanActAs],
            }
            await store.addWallet(wallet)

            await expect(
                store.getWalletByJwt(authContextMock.userId, 'party1', [
                    'self-issued-aud',
                ])
            ).resolves.toMatchObject({
                partyId: 'party1',
                userId: authContextMock.userId,
                networkId: 'network-self-issued',
            })
            await expect(
                store.getWalletByJwt(authContextMock.userId, 'missing', [
                    'self-issued-aud',
                ])
            ).resolves.toBeUndefined()
            await expect(
                store.getWalletByJwt('other-user', 'party1', [
                    'self-issued-aud',
                ])
            ).resolves.toBeUndefined()
            await expect(
                store.getWalletByJwt(authContextMock.userId, 'party1', [
                    'other-aud',
                ])
            ).resolves.toBeUndefined()
        })

        test('should select the wallet on the self-issued network matching the JWT audience', async () => {
            await store.addIdp(selfIssuedIdp())
            await store.addNetwork(selfIssuedNetwork('network-a', 'aud-a'))
            await store.addNetwork(selfIssuedNetwork('network-b', 'aud-b'))
            await store.addWallet(
                baseWallet('party1', 'network-a', { publicKey: 'key-a' })
            )
            await store.addWallet(
                baseWallet('party1', 'network-b', { publicKey: 'key-b' })
            )

            await expect(
                store.getWalletByJwt(authContextMock.userId, 'party1', [
                    'aud-b',
                ])
            ).resolves.toMatchObject({
                networkId: 'network-b',
                publicKey: 'key-b',
            })
        })

        test('should throw when multiple self-issued networks match the JWT audience', async () => {
            const collidingStore = new StoreImpl(
                {
                    idps: [],
                    networks: [
                        selfIssuedNetwork('n1', 'shared-aud'),
                        selfIssuedNetwork('n2', 'shared-aud'),
                    ],
                },
                getLogger('mock'),
                authContextMock
            )

            await expect(
                collidingStore.getWalletByJwt(
                    authContextMock.userId,
                    'party1',
                    ['shared-aud']
                )
            ).rejects.toThrow(
                'Multiple self-issued networks match token audience: n1, n2'
            )
        })

        test('should filter wallets', async () => {
            const idp: Idp = {
                id: 'idp1',
                type: 'oauth' as const,
                issuer: 'http://auth',
                configUrl: 'http://auth/.well-known/openid-configuration',
            }
            const network1: Network = {
                id: 'network1',
                name: 'testnet-1',
                synchronizerId: 'sync1::fingerprint',
                description: 'Test Network 1',
                identityProviderId: 'idp1',
                ledgerApi: { baseUrl: 'http://api' },
                auth: {
                    method: 'authorization_code',
                    clientId: 'cid',
                    scope: 'scope',
                    audience: 'aud',
                },
            }
            const network2: Network = {
                id: 'network2',
                name: 'testnet-2',
                synchronizerId: 'sync2::fingerprint',
                description: 'Test Network 2',
                identityProviderId: 'idp1',
                ledgerApi: { baseUrl: 'http://api' },
                auth: {
                    method: 'authorization_code',
                    clientId: 'cid',
                    scope: 'scope',
                    audience: 'aud',
                },
            }
            const session: Session = {
                id: 'session1',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            }
            await store.addIdp(idp)
            await store.addNetwork(network1)
            await store.addNetwork(network2)
            await store.setSession(session)

            const wallet1: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party1',
                status: 'allocated',
                hint: 'hint1',
                signingProviderId: 'internal1',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
                rights: [PartyLevelRight.CanActAs],
            }
            const wallet2: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party2',
                status: 'allocated',
                hint: 'hint2',
                signingProviderId: 'internal2',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
                rights: [PartyLevelRight.CanActAs],
            }
            const wallet3: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party3',
                status: 'allocated',
                hint: 'hint3',
                signingProviderId: 'internal2',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network2',
                rights: [PartyLevelRight.CanActAs],
            }
            await store.addWallet(wallet1)
            await store.addWallet(wallet2)
            await store.addWallet(wallet3)

            const getAllWallets = await store.getWallets()
            const getAllWalletsAcrossNetworks = await store.getAllWallets({
                networkIds: ['network1', 'network2'],
            })
            const getWalletsByNetworkId = await store.getAllWallets({
                networkIds: ['network1'],
            })
            const getWalletsBySigningProviderId = await store.getAllWallets({
                signingProviderIds: ['internal2'],
            })
            const getWalletsByNetworkIdAndSigningProviderId =
                await store.getAllWallets({
                    networkIds: ['network1'],
                    signingProviderIds: ['internal2'],
                })

            expect(getAllWallets).toHaveLength(2)
            expect(getAllWalletsAcrossNetworks).toHaveLength(3)
            expect(getWalletsByNetworkId).toHaveLength(2)
            expect(getWalletsBySigningProviderId).toHaveLength(2)
            expect(getWalletsByNetworkIdAndSigningProviderId).toHaveLength(1)
            expect(await store.getWallet('party1')).toMatchObject({
                partyId: 'party1',
                networkId: 'network1',
            })
            expect(await store.getWallet('party3')).toBeNull()
        })

        test('should set and get primary wallet', async () => {
            const idp: Idp = {
                id: 'idp1',
                type: 'oauth' as const,
                issuer: 'http://auth',
                configUrl: 'http://auth/.well-known/openid-configuration',
            }
            const ledgerApi: LedgerApi = {
                baseUrl: 'http://api',
            }
            const auth: AuthorizationCodeAuth = {
                method: 'authorization_code',
                clientId: 'cid',
                scope: 'scope',
                audience: 'aud',
            }
            const network: Network = {
                id: 'network1',
                name: 'testnet',
                synchronizerId: 'sync1::fingerprint',
                description: 'Test Network',
                identityProviderId: 'idp1',
                ledgerApi,
                auth,
            }
            const wallet1: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party1',
                status: 'allocated',
                hint: 'hint1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
                rights: [PartyLevelRight.CanActAs],
            }
            const wallet2: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party2',
                status: 'allocated',
                hint: 'hint2',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
                rights: [PartyLevelRight.CanActAs],
            }
            const session: Session = {
                id: 'sess-123',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            }
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession(session)
            await store.addWallet(wallet1)
            await store.addWallet(wallet2)
            await store.setPrimaryWallet('party2')
            const primary = await store.getPrimaryWallet()
            expect(primary?.partyId).toBe('party2')
            expect(primary?.primary).toBe(true)
        })

        test('should set and get session', async () => {
            const session: Session = {
                id: 'sess-123',
                origin: 'dapp-1',
                network: 'net',
                accessToken: 'test-access-token',
            }
            await store.setSession(session)
            const result = await store.getSession('test-access-token')
            expect(result).toEqual({
                ...session,
                userId: authContextMock.userId,
            })
            await store.removeSession('test-access-token')
            const removed = await store.getSession('test-access-token')
            expect(removed).toBeUndefined()
        })

        test('should resolve the current network from a tokenless session', async () => {
            const network: Network = {
                id: 'network1',
                name: 'testnet',
                description: 'Test Network',
                identityProviderId: 'idp1',
                ledgerApi: { baseUrl: 'http://api' },
                auth: {
                    method: 'authorization_code',
                    clientId: 'cid',
                    scope: 'scope',
                    audience: 'aud',
                },
            }
            const onboardingStore = new StoreInternal(
                { idps: [oauthIdp()], networks: [network] },
                getLogger('mock'),
                {
                    userId: authContextMock.userId,
                    accessToken: '',
                    sessionId: 'onboarding-session',
                }
            )
            await onboardingStore.setSession({
                id: 'onboarding-session',
                origin: 'https://example.com',
                network: network.id,
            })

            await expect(onboardingStore.getCurrentNetwork()).resolves.toEqual(
                network
            )
            await expect(
                onboardingStore.getOnboardingSession('onboarding-session')
            ).resolves.toEqual(
                expect.objectContaining({
                    id: 'onboarding-session',
                    userId: authContextMock.userId,
                })
            )
            await expect(
                onboardingStore
                    .withAuthContext({
                        userId: authContextMock.userId,
                        accessToken: '',
                    })
                    .getCurrentNetwork()
            ).rejects.toThrow('No session found')
        })

        test('should not replace tokenless session on same origins', async () => {
            await store.setSession({
                id: 'onboarding-1',
                origin: 'https://a.example',
                network: 'network1',
            })
            await store.setSession({
                id: 'onboarding-2',
                origin: 'https://b.example',
                network: 'network1',
            })
            await store.setSession({
                id: 'onboarding-3',
                origin: 'https://a.example',
                network: 'network1',
            })

            const ids = (await store.listSessions()).map((s) => s.id).sort()
            expect(ids).toEqual([
                'onboarding-1',
                'onboarding-2',
                'onboarding-3',
            ])
        })

        test('should keep a tokenless session when a logged-in session is created at the same origin', async () => {
            const baseSession = {
                origin: 'https://example.com',
                network: 'network1',
            }
            await store.setSession({
                ...baseSession,
                id: 'onboarding-session',
            })
            await store.setSession({
                ...baseSession,
                id: 'authenticated-session',
                accessToken: authContextMock.accessToken,
            })

            const ids = (await store.listSessions()).map((s) => s.id).sort()
            expect(ids).toEqual(['authenticated-session', 'onboarding-session'])
        })

        test('should upgrade an onboarding session in place', async () => {
            await store.setSession({
                id: 'old-session',
                origin: 'https://example.com',
                network: 'network1',
                accessToken: 'old-token',
            })
            await store.setSession({
                id: 'onboarding-session',
                origin: 'https://example.com',
                network: 'network1',
            })
            await expect(store.listSessions()).resolves.toHaveLength(2)

            await store.upgradeOnboardingSession(
                'onboarding-session',
                'new-token'
            )

            await expect(store.listSessions()).resolves.toEqual([
                expect.objectContaining({
                    id: 'onboarding-session',
                    accessToken: 'new-token',
                }),
            ])
            await expect(store.getSession('new-token')).resolves.toEqual(
                expect.objectContaining({ id: 'onboarding-session' })
            )
            await expect(
                store.upgradeOnboardingSession('onboarding-session', 'other')
            ).rejects.toThrow('Onboarding session not found')
        })

        test('should add, list, get, update, and remove networks', async () => {
            const idp: Idp = {
                id: 'idp1',
                type: 'oauth' as const,
                issuer: 'http://auth',
                configUrl: 'http://auth/.well-known/openid-configuration',
            }
            const ledgerApi: LedgerApi = {
                baseUrl: 'http://api',
            }
            const auth: AuthorizationCodeAuth = {
                method: 'authorization_code',
                clientId: 'cid',
                scope: 'scope',
                audience: 'aud',
            }
            const network: Network = {
                id: 'network1',
                name: 'testnet',
                synchronizerId: 'sync1::fingerprint',
                description: 'Test Network',
                identityProviderId: 'idp1',
                ledgerApi,
                auth,
            }
            await store.addIdp(idp)
            await store.addNetwork(network)
            const listed = await store.listNetworks()
            expect(listed).toHaveLength(1)
            expect(listed[0].name).toBe('testnet')

            store.updateNetwork({ ...network, name: 'testnet-updated' })

            const fetched = await store.getNetwork('network1')
            expect(fetched.name).toBe('testnet-updated')

            await store.removeNetwork('network1')
            const afterRemove = await store.listNetworks()
            expect(afterRemove).toHaveLength(0)
        })

        test('should reject a second self-issued network with the same audience', async () => {
            await store.addIdp(selfIssuedIdp())
            await store.addNetwork(selfIssuedNetwork('network-a', 'shared-aud'))

            await expect(
                store.addNetwork(selfIssuedNetwork('network-b', 'shared-aud'))
            ).rejects.toThrow(
                'Self-issued audience "shared-aud" is already used by network "network-a"'
            )
        })

        test('should reject updating a self-issued network to a colliding audience', async () => {
            await store.addIdp(selfIssuedIdp())
            await store.addNetwork(selfIssuedNetwork('network-a', 'aud-a'))
            await store.addNetwork(selfIssuedNetwork('network-b', 'aud-b'))

            await expect(
                store.updateNetwork(selfIssuedNetwork('network-b', 'aud-a'))
            ).rejects.toThrow(
                'Self-issued audience "aud-a" is already used by network "network-a"'
            )
        })

        test('should allow a self-issued network to keep its own audience on update', async () => {
            await store.addIdp(selfIssuedIdp())
            await store.addNetwork(selfIssuedNetwork('network-a', 'aud-a'))

            await expect(
                store.updateNetwork({
                    ...selfIssuedNetwork('network-a', 'aud-a'),
                    description: 'updated',
                })
            ).resolves.toBeUndefined()
            expect((await store.getNetwork('network-a')).description).toBe(
                'updated'
            )
        })

        test('should throw when getting a non-existent network', async () => {
            await expect(store.getNetwork('doesnotexist')).rejects.toThrow()
        })

        test('should throw when getting current network if none set', async () => {
            await expect(store.getCurrentNetwork()).rejects.toThrow()
        })

        test('should allow same party ID across different networks', async () => {
            const idp: Idp = {
                id: 'idp1',
                type: 'oauth' as const,
                issuer: 'http://auth',
                configUrl: 'http://auth/.well-known/openid-configuration',
            }
            const network1: Network = {
                id: 'network1',
                name: 'testnet-1',
                synchronizerId: 'sync1::fingerprint',
                description: 'Test Network 1',
                identityProviderId: 'idp1',
                ledgerApi: { baseUrl: 'http://api' },
                auth: {
                    method: 'authorization_code',
                    clientId: 'cid',
                    scope: 'scope',
                    audience: 'aud',
                },
            }
            const network2: Network = {
                id: 'network2',
                name: 'testnet-2',
                synchronizerId: 'sync2::fingerprint',
                description: 'Test Network 2',
                identityProviderId: 'idp1',
                ledgerApi: { baseUrl: 'http://api' },
                auth: {
                    method: 'authorization_code',
                    clientId: 'cid',
                    scope: 'scope',
                    audience: 'aud',
                },
            }
            const session: Session = {
                id: 'session1',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            }
            await store.addIdp(idp)
            await store.addNetwork(network1)
            await store.addNetwork(network2)
            await store.setSession(session)

            const wallet1: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party1::namespace',
                status: 'allocated',
                hint: 'party1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
                rights: [PartyLevelRight.CanActAs],
            }
            const wallet2: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party1::namespace', // Same party ID
                status: 'allocated',
                hint: 'party1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network2', // Different network
                rights: [PartyLevelRight.CanActAs],
            }
            await store.addWallet(wallet1)
            await store.addWallet(wallet2) // Should not throw

            const wallets = await store.getWallets()
            expect(wallets).toHaveLength(1)
            const allWallets = await store.getAllWallets({
                networkIds: ['network1', 'network2'],
            })
            expect(allWallets).toHaveLength(2)
            expect(
                allWallets.filter((w) => w.partyId === 'party1::namespace')
            ).toHaveLength(2)
        })

        test('should have separate primary wallets per network', async () => {
            const idp: Idp = {
                id: 'idp1',
                type: 'oauth' as const,
                issuer: 'http://auth',
                configUrl: 'http://auth/.well-known/openid-configuration',
            }
            const ledgerApi: LedgerApi = {
                baseUrl: 'http://api',
            }
            const auth: AuthorizationCodeAuth = {
                method: 'authorization_code',
                clientId: 'cid',
                scope: 'scope',
                audience: 'aud',
            }
            const network1: Network = {
                id: 'network1',
                name: 'testnet-1',
                synchronizerId: 'sync1::fingerprint',
                description: 'Test Network 1',
                identityProviderId: 'idp1',
                ledgerApi,
                auth,
            }
            const network2: Network = {
                id: 'network2',
                name: 'testnet-2',
                synchronizerId: 'sync2::fingerprint',
                description: 'Test Network 2',
                identityProviderId: 'idp1',
                ledgerApi,
                auth,
            }
            await store.addIdp(idp)
            const wallet1: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party1',
                status: 'allocated',
                hint: 'hint1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
                rights: [PartyLevelRight.CanActAs],
            }
            const wallet2: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party2',
                status: 'allocated',
                hint: 'hint2',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
                rights: [PartyLevelRight.CanActAs],
            }
            const wallet3: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party3',
                status: 'allocated',
                hint: 'hint3',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network2',
                rights: [PartyLevelRight.CanActAs],
            }
            const wallet4: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party4',
                status: 'allocated',
                hint: 'hint4',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network2',
                rights: [PartyLevelRight.CanActAs],
            }

            await store.addNetwork(network1)
            await store.addNetwork(network2)

            const session1: Session = {
                id: 'sess-1',
                network: 'network1',
                origin: 'dapp-1',
                accessToken: 'test-access-token',
            }
            await store.setSession(session1)
            await store.addWallet(wallet1)
            await store.addWallet(wallet2)
            await store.setPrimaryWallet('party2')
            const primary1 = await store.getPrimaryWallet()
            expect(primary1?.partyId).toBe('party2')
            expect(primary1?.networkId).toBe('network1')

            const session2: Session = {
                id: 'sess-2',
                origin: 'dapp-1',
                network: 'network2',
                accessToken: 'test-access-token',
            }
            await store.setSession(session2)
            await store.addWallet(wallet3)
            await store.addWallet(wallet4)
            await store.setPrimaryWallet('party4')
            const primary2 = await store.getPrimaryWallet()
            expect(primary2?.partyId).toBe('party4')
            expect(primary2?.networkId).toBe('network2')

            // Verify network1 still has party2 as primary
            await store.setSession(session1)
            const primary1Again = await store.getPrimaryWallet()
            expect(primary1Again?.partyId).toBe('party2')
            expect(primary1Again?.networkId).toBe('network1')
        })

        test('addWallet should allow insert when same party exists on different network', async () => {
            const wallet1: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party1::namespace',
                status: 'allocated',
                hint: 'party1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                rights: [PartyLevelRight.CanActAs],
                networkId: 'network1',
            }
            const wallet2: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party1::namespace', // Same party ID
                status: 'allocated',
                hint: 'party1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                rights: [PartyLevelRight.CanActAs],
                networkId: 'network2', // Different network
            }

            // Set session for network1
            const session1: Session = {
                id: 'sess-1',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            }
            await store.setSession(session1)
            await store.addWallet(wallet1)

            // Switch to network2 and add same party
            const session2: Session = {
                id: 'sess-2',
                origin: 'dapp-1',
                network: 'network2',
                accessToken: 'test-access-token',
            }
            await store.setSession(session2)
            await store.addWallet(wallet2) // Should not throw, should create new entry

            const wallets = await store.getAllWallets({
                networkIds: ['network1', 'network2'],
            })
            expect(wallets).toHaveLength(2)
            expect(
                wallets.filter((w) => w.partyId === 'party1::namespace')
            ).toHaveLength(2)
            expect(
                wallets.find((w) => w.networkId === 'network1')?.partyId
            ).toBe('party1::namespace')
            expect(
                wallets.find((w) => w.networkId === 'network2')?.partyId
            ).toBe('party1::namespace')
        })

        test('should allow duplicate commandIds and update by transaction id', async () => {
            const initial: Transaction = {
                id: 'tx-immutable-1',
                commandId: 'cmd-immutable',
                status: 'pending',
                preparedTransaction: 'prepared-1',
                preparedTransactionHash: 'hash-1',
                payload: { amount: 100 },
                origin: 'https://safe.example',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
            }

            await store.setTransaction(initial)

            await store.setTransaction({
                ...initial,
                id: 'tx-immutable-2',
            })

            await store.setTransactionSigned(
                initial.id,
                new Date('2026-01-01T00:01:00.000Z')
            )
            await store.setTransactionStatus(initial.id, 'executed', {
                payload: { result: 'ok' },
            })

            const persisted = await store.getTransaction(initial.id)
            expect(persisted?.preparedTransaction).toBe('prepared-1')
            expect(persisted?.preparedTransactionHash).toBe('hash-1')
            expect(persisted?.payload).toEqual({ result: 'ok' })
            expect(persisted?.origin).toBe('https://safe.example')
            expect(persisted?.status).toBe('executed')
            expect(persisted?.signedAt).toEqual(
                new Date('2026-01-01T00:01:00.000Z')
            )

            const duplicates = (await store.listTransactions()).transactions
            expect(
                duplicates.filter((tx) => tx.commandId === initial.commandId)
            ).toHaveLength(2)
        })

        test('should manage idps', async () => {
            const idp = oauthIdp()
            await store.addIdp(idp)
            expect(await store.getIdp('idp1')).toEqual(idp)
            await store.updateIdp({ ...idp, issuer: 'http://updated' })
            expect((await store.listIdps())[0]?.issuer).toBe('http://updated')
            await expect(store.addIdp(idp)).rejects.toThrow(
                'IdP "idp1" already exists'
            )
            await expect(
                store.updateIdp({ ...idp, id: 'missing' })
            ).rejects.toThrow('IdP "missing" not found')
            await store.removeIdp('idp1')
            await expect(store.getIdp('idp1')).rejects.toThrow(
                'IdP "idp1" not found'
            )
        })

        test('should reject duplicate wallet and unknown primary wallet', async () => {
            await store.addIdp(oauthIdp())
            await store.addNetwork(baseNetwork())
            await store.setSession({
                id: 'session1',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })
            const wallet = baseWallet('party1')
            await store.addWallet(wallet)
            await expect(store.addWallet(wallet)).rejects.toThrow(
                'already exists'
            )
            await expect(
                store.setPrimaryWallet('missing-party')
            ).rejects.toThrow(
                'Wallet with partyId "missing-party" not found in network "network1"'
            )
        })

        test('should manage user-level rights per network', async () => {
            await store.addIdp(oauthIdp())
            await store.addNetwork(baseNetwork())
            await store.setSession({
                id: 'session1',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })

            await store.setUserRights('network1', [
                UserLevelRight.CanReadAsAnyParty,
            ])
            expect(await store.getUserRights()).toEqual([
                UserLevelRight.CanReadAsAnyParty,
            ])
            await store.setUserRights('network1', [])
            expect(await store.getUserRights()).toEqual([])
        })

        test('should manage transactions including lookup and removal', async () => {
            const tx: Transaction = {
                id: 'tx-1',
                commandId: 'cmd-a',
                status: 'pending',
                preparedTransaction: 'p',
                preparedTransactionHash: 'h',
                createdAt: new Date('2026-01-02T00:00:00.000Z'),
                origin: 'https://example',
            }
            const older: Transaction = {
                id: 'tx-0',
                commandId: 'cmd-a',
                status: 'pending',
                preparedTransaction: 'p0',
                preparedTransactionHash: 'h0',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                origin: 'https://example',
            }

            await store.setTransaction(older)
            await store.setTransaction(tx)

            expect(
                await store.getLatestTransactionByCommandId('cmd-a')
            ).toEqual(tx)

            await store.setTransactionSigned(
                'tx-1',
                new Date('2026-01-03T00:00:00.000Z'),
                'ext-1'
            )
            expect((await store.getTransaction('tx-1'))?.externalTxId).toBe(
                'ext-1'
            )

            await expect(
                store.setTransactionStatus('missing', 'signed')
            ).rejects.toThrow('Transaction not found')

            await store.removeTransaction('tx-0')
            expect((await store.listTransactions()).transactions).toHaveLength(
                1
            )
        })

        test('should manage message signing requests', async () => {
            const message: MessageRaw = {
                id: 'msg-1',
                status: 'pending',
                userId: authContextMock.userId,
                partyId: 'party1',
                publicKey: 'pk',
                message: 'hello',
                origin: 'https://app.example',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
            }

            await store.setMessageRaw(message)
            await store.setMessageRawStatus('msg-1', 'signed', {
                signature: 'sig',
                signedAt: new Date('2026-01-01T00:01:00.000Z'),
            })

            const stored = await store.getMessageRaw('msg-1')
            expect(stored?.status).toBe('signed')
            expect(stored?.signature).toBe('sig')
            expect(await store.listMessageRaws()).toHaveLength(1)

            await expect(
                store.setMessageRaw({ ...message, userId: 'other-user' })
            ).rejects.toThrow('userId mismatch')

            await expect(
                store.setMessageRawStatus('missing', 'failed')
            ).rejects.toThrow('MessageRaw not found')

            await store.removeMessageRaw('msg-1')
            expect(await store.listMessageRaws()).toHaveLength(0)
        })

        test('should manage api keys', async () => {
            await store.addNetwork(baseNetwork())
            await store.setSession({
                id: 'session1',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })

            const keys = await store.listApiKeys()
            expect(keys).toHaveLength(0)

            const apiKey: ApiKey = {
                id: 'api-key-1',
                digest: 'digest-1',
                name: 'API Key 1',
                userId: 'test-user-id',
                email: 'user1@example.com',
                networkId: 'network1',
                createdAt: new Date('2026-05-08T13:00:00.000Z'),
            }

            await store.addApiKey(apiKey)

            expect(await store.listApiKeys()).toHaveLength(1)

            await store.removeApiKey('api-key-1')
            expect(await store.listApiKeys()).toHaveLength(0)

            // removing a non-existent key should not throw
            await expect(
                store.removeApiKey('non-existent')
            ).resolves.toBeUndefined()
        })

        test('addApiKey should error with wrong userId or networkId', async () => {
            await store.addNetwork(baseNetwork())
            await store.setSession({
                id: 'session1',
                origin: 'dapp-1',
                network: 'network2',
                accessToken: 'test-access-token',
            })

            const apiKey: ApiKey = {
                id: 'api-key-1',
                digest: 'digest-1',
                name: 'API Key 1',
                userId: 'test-user-id',
                email: 'user1@example.com',
                networkId: 'network1',
                createdAt: new Date('2026-05-08T13:00:00.000Z'),
            }

            await expect(store.addApiKey(apiKey)).rejects.toThrow(
                'Network "network2" not found'
            )

            const newstore = (store as StoreInternal).withAuthContext({
                userId: 'other-user-id',
                accessToken: 'test-access-token',
            })

            await expect(
                newstore.addApiKey({ ...apiKey, networkId: 'network2' })
            ).rejects.toThrow(
                'ApiKey userId mismatch: expected other-user-id, got test-user-id'
            )
        })

        test('paginate list transactions', async () => {
            for (let i = 0; i < 10; i++) {
                const date =
                    i % 2 > 0
                        ? new Date(`2026-01-02T00:00:00.000Z`)
                        : new Date(`2026-01-01T00:00:00.000Z`)

                const tx = addTx(`tx${i}`, date)

                await store.setTransaction(tx)
            }

            const listAllTxs = await store.listTransactions()

            const collected: Transaction[] = []

            let page = await store.listTransactions({ limit: 5 })
            collected.push(...page.transactions)
            let timesCalled = 1
            while (page.nextCursor !== null) {
                timesCalled++
                page = await store.listTransactions({
                    cursor: page.nextCursor,
                    limit: 5,
                })
                collected.push(...page.transactions)
            }

            expect(listAllTxs.transactions).toEqual(collected)
            expect(timesCalled).toBe(2)
        })

        test('paginate list transactions if createdAt is null for some txs', async () => {
            for (let i = 0; i < 10; i++) {
                const date =
                    i % 2 > 0 ? new Date(`2026-01-02T00:00:00.000Z`) : undefined

                const tx = addTx(`tx${i}`, date)

                await store.setTransaction(tx)
            }

            const listAllTxs = await store.listTransactions()

            const collected: Transaction[] = []

            let page = await store.listTransactions({ limit: 5 })
            collected.push(...page.transactions)
            let timesCalled = 1

            while (page.nextCursor !== null) {
                timesCalled++
                page = await store.listTransactions({
                    cursor: page.nextCursor,
                    limit: 5,
                })
                collected.push(...page.transactions)
            }

            expect(listAllTxs.transactions).toEqual(collected)
            expect(timesCalled).toBe(2)
        })

        test('return total number of transactions', async () => {
            for (let i = 0; i < 10; i++) {
                const date =
                    i % 2 > 0
                        ? new Date(`2026-01-02T00:00:00.000Z`)
                        : new Date(`2026-01-01T00:00:00.000Z`)

                const tx = addTx(`tx${i}`, date)

                await store.setTransaction(tx)
            }

            const count = await store.transactionsCount()
            expect(count).toBe(10)
        })
    })
})
