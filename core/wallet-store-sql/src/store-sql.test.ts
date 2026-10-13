// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test, beforeEach, afterEach } from 'vitest'

import type {
    AuthContext,
    AuthorizationCodeAuth,
    Idp,
} from '@canton-network/core-wallet-auth'
import {
    type LedgerApi,
    type MessageRaw,
    type Network,
    PartyLevelRight,
    type Session,
    type Transaction,
    UserLevelRight,
    type Wallet,
} from '@canton-network/core-wallet-store'
import type { Kysely } from 'kysely'
import { type Logger, pino } from 'pino'
import { sink } from 'pino-test'
import { migrator } from './migrator'
import type { DB } from './schema'
import { connection, StoreSql } from './store-sql'

const authContextMock: AuthContext = {
    userId: 'test-user-id',
    accessToken: 'test-access-token',
}

const storeConfig = {
    connection: {
        type: 'memory' as const,
    },
    idps: [],
    networks: [],
}

type StoreCtor = new (
    db: Kysely<DB>,
    logger: Logger,
    authContext?: AuthContext
) => StoreSql

const implementations: Array<[string, StoreCtor]> = [['StoreSql', StoreSql]]

const ledgerApi: LedgerApi = {
    baseUrl: 'http://api',
}
const auth: AuthorizationCodeAuth = {
    method: 'authorization_code',
    clientId: 'cid',
    scope: 'scope',
    audience: 'aud',
}
const idp: Idp = {
    id: 'idp1',
    issuer: 'http://idp1',
    type: 'oauth',
    configUrl: 'http://idp-config',
}
const idp2: Idp = {
    id: 'idp2',
    type: 'self_signed',
    issuer: 'http://idp2',
}

const network: Network = {
    name: 'testnet',
    id: 'network1',
    synchronizerId: 'sync1::fingerprint',
    identityProviderId: 'idp1',
    description: 'Test Network',
    ledgerApi,
    auth,
}

const selfIssuedIdp: Idp = {
    id: 'idp-self-issued',
    type: 'self_issued',
}

const selfIssuedNetwork = (id: string, audience: string): Network => ({
    name: `self-issued-${id}`,
    id,
    synchronizerId: 'sync1::fingerprint',
    identityProviderId: selfIssuedIdp.id,
    description: `Self-issued ${id}`,
    ledgerApi,
    auth: {
        method: 'self_issued',
        audience,
        scope: 'daml_ledger_api',
    },
})

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
        let db: Kysely<DB>

        beforeEach(async () => {
            db = connection(storeConfig)
            const umzug = migrator(db)
            await umzug.up()
        })

        afterEach(async () => {
            await db.destroy()
        })

        test('should add and retrieve wallets', async () => {
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
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            const session: Session = {
                id: 'session1',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            }
            await store.setSession(session)
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
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(selfIssuedIdp)
            await store.addNetwork(
                selfIssuedNetwork('network-self-issued', 'self-issued-aud')
            )
            const session: Session = {
                id: 'session1',
                origin: 'dapp-1',
                network: 'network-self-issued',
                accessToken: 'test-access-token',
            }
            await store.setSession(session)
            await store.addWallet(wallet)
            await store.removeSession(session.accessToken)

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
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(selfIssuedIdp)
            await store.addNetwork(selfIssuedNetwork('network-a', 'aud-a'))
            await store.addNetwork(selfIssuedNetwork('network-b', 'aud-b'))
            await store.setSession({
                id: 'session1',
                origin: 'dapp-1',
                network: 'network-a',
                accessToken: 'test-access-token',
            })
            await store.addWallet({
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party1',
                status: 'allocated',
                hint: 'hint',
                signingProviderId: 'internal',
                publicKey: 'key-a',
                namespace: 'namespace',
                networkId: 'network-a',
                rights: [PartyLevelRight.CanActAs],
            })
            await store.addWallet({
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party1',
                status: 'allocated',
                hint: 'hint',
                signingProviderId: 'internal',
                publicKey: 'key-b',
                namespace: 'namespace',
                networkId: 'network-b',
                rights: [PartyLevelRight.CanActAs],
            })
            await store.removeSession('test-access-token')

            await expect(
                store.getWalletByJwt(authContextMock.userId, 'party1', [
                    'aud-b',
                ])
            ).resolves.toMatchObject({
                networkId: 'network-b',
                publicKey: 'key-b',
            })
        })

        test('should filter wallets', async () => {
            const auth2: AuthorizationCodeAuth = {
                method: 'authorization_code',
                clientId: 'cid',
                scope: 'scope',
                audience: 'aud',
            }
            const network2: Network = {
                name: 'testnet',
                id: 'network2',
                synchronizerId: 'sync1::fingerprint',
                identityProviderId: 'idp2',
                description: 'Test Network',
                ledgerApi,
                auth: auth2,
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
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addIdp(idp2)
            await store.addNetwork(network)
            await store.addNetwork(network2)
            const session: Session = {
                id: 'session1',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            }
            await store.setSession(session)
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
                signingProviderIds: ['internal'],
            })
            const getWalletsByNetworkIdAndSigningProviderId =
                await store.getAllWallets({
                    networkIds: ['network1'],
                    signingProviderIds: ['internal'],
                })
            expect(getAllWallets).toHaveLength(2)
            expect(getAllWalletsAcrossNetworks).toHaveLength(3)
            expect(getWalletsByNetworkId).toHaveLength(2)
            expect(getWalletsBySigningProviderId).toHaveLength(3)
            expect(getWalletsByNetworkIdAndSigningProviderId).toHaveLength(2)
            expect(await store.getWallet('party1')).toMatchObject({
                partyId: 'party1',
                networkId: 'network1',
            })
            expect(await store.getWallet('party3')).toBeNull()
        })

        test('should set and get primary wallet', async () => {
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
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            // Set session so getCurrentNetwork() works
            const session: Session = {
                id: 'sess-123',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            }
            await store.setSession(session)
            await store.addWallet(wallet1)
            await store.addWallet(wallet2)
            await store.setPrimaryWallet('party2')
            const primary = await store.getPrimaryWallet()
            expect(primary?.partyId).toBe('party2')
            expect(primary?.primary).toBe(true)
        })

        test('should persist wallet rights and update rights-only changes', async () => {
            const wallet: Wallet = {
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party-rights',
                status: 'allocated',
                hint: 'rights',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
                rights: [
                    PartyLevelRight.CanActAs,
                    PartyLevelRight.CanExecuteAs,
                ],
            }
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'session-rights',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })
            await store.addWallet(wallet)

            await store.updateWallet({
                partyId: 'party-rights',
                rights: [PartyLevelRight.CanReadAs],
            })

            const fetchedWallet = (await store.getWallets()).find(
                (w) => w.partyId === 'party-rights'
            )
            expect(fetchedWallet?.rights).toEqual([PartyLevelRight.CanReadAs])
        })

        test('should set and get session', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            const session: Session = {
                id: 'sess-123',
                origin: 'dapp-1',
                network: 'network1',
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

        test('should resolve the current network from a tokenless session id', async () => {
            const onboardingContext: AuthContext = {
                userId: authContextMock.userId,
                accessToken: '',
                sessionId: 'onboarding-session',
            }
            const store = new StoreImpl(db, pino(sink()), onboardingContext)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'onboarding-session',
                origin: 'https://example.com',
                network: network.id,
            })

            await expect(store.getCurrentNetwork()).resolves.toEqual(network)
            await expect(
                store.getOnboardingSession('onboarding-session')
            ).resolves.toEqual(
                expect.objectContaining({
                    id: 'onboarding-session',
                    userId: onboardingContext.userId,
                })
            )
            await expect(
                new StoreImpl(db, pino(sink()), {
                    userId: authContextMock.userId,
                    accessToken: '',
                }).getCurrentNetwork()
            ).rejects.toThrow('No session found')
        })

        test('should keep every tokenless session', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
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
            const store = new StoreImpl(db, pino(sink()), authContextMock)
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
            await expect(
                store.getOnboardingSession('onboarding-session')
            ).resolves.toEqual(
                expect.objectContaining({ id: 'onboarding-session' })
            )
        })

        test('should keep a logged-in session when a tokenless session starts at the same origin', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            const baseSession = {
                origin: 'https://example.com',
                network: 'network1',
            }
            await store.setSession({
                ...baseSession,
                id: 'authenticated-session',
                accessToken: authContextMock.accessToken,
            })
            await store.setSession({
                ...baseSession,
                id: 'onboarding-session',
            })

            const ids = (await store.listSessions()).map((s) => s.id).sort()
            expect(ids).toEqual(['authenticated-session', 'onboarding-session'])
        })

        test('should upgrade an onboarding session in place', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
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

            await expect(
                store.upgradeOnboardingSession(
                    'onboarding-session',
                    'new-token'
                )
            ).resolves.toEqual(
                expect.objectContaining({
                    id: 'onboarding-session',
                    network: 'network1',
                    accessToken: 'new-token',
                })
            )
            await expect(store.listSessions()).resolves.toEqual([
                expect.objectContaining({
                    id: 'onboarding-session',
                    accessToken: 'new-token',
                }),
            ])
            await expect(
                store.upgradeOnboardingSession('onboarding-session', 'other')
            ).rejects.toThrow('Onboarding session not found')
        })

        test('should add, list, get, update, and remove networks', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)

            const listed = await store.listNetworks()
            expect(listed).toHaveLength(1)
            expect(listed[0].description).toBe('Test Network')

            await store.updateNetwork({
                ...network,
                description: 'Updated Network',
            })

            const fetched = await store.getNetwork('network1')
            expect(fetched.description).toBe('Updated Network')

            await store.removeNetwork('network1')
            const afterRemove = await store.listNetworks()
            expect(afterRemove).toHaveLength(0)
        })

        test('should reject a second self-issued network with the same audience', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(selfIssuedIdp)
            await store.addNetwork(selfIssuedNetwork('network-a', 'shared-aud'))

            await expect(
                store.addNetwork(selfIssuedNetwork('network-b', 'shared-aud'))
            ).rejects.toThrow(
                'Self-issued audience "shared-aud" is already used by network "network-a"'
            )
        })

        test('should reject updating a self-issued network to a colliding audience', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(selfIssuedIdp)
            await store.addNetwork(selfIssuedNetwork('network-a', 'aud-a'))
            await store.addNetwork(selfIssuedNetwork('network-b', 'aud-b'))

            await expect(
                store.updateNetwork(selfIssuedNetwork('network-b', 'aud-a'))
            ).rejects.toThrow(
                'Self-issued audience "aud-a" is already used by network "network-a"'
            )
        })

        test('should allow a self-issued network to keep its own audience on update', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(selfIssuedIdp)
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
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await expect(store.getNetwork('doesnotexist')).rejects.toThrow()
        })

        test('should throw when getting current network if none set', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await expect(store.getCurrentNetwork()).rejects.toThrow()
        })

        test('should allow same party ID across different networks', async () => {
            const auth2: AuthorizationCodeAuth = {
                method: 'authorization_code',
                clientId: 'cid',
                scope: 'scope',
                audience: 'aud',
            }
            const network2: Network = {
                name: 'testnet2',
                id: 'network2',
                synchronizerId: 'sync1::fingerprint',
                identityProviderId: 'idp1',
                description: 'Test Network 2',
                ledgerApi,
                auth: auth2,
            }
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
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.addNetwork(network2)
            const session: Session = {
                id: 'session1',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            }
            await store.setSession(session)
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
            const auth2: AuthorizationCodeAuth = {
                method: 'authorization_code',
                clientId: 'cid',
                scope: 'scope',
                audience: 'aud',
            }
            const network2: Network = {
                name: 'testnet2',
                id: 'network2',
                synchronizerId: 'sync1::fingerprint',
                identityProviderId: 'idp1',
                description: 'Test Network 2',
                ledgerApi,
                auth: auth2,
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
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.addNetwork(network2)

            // Set session for network1
            const session1: Session = {
                id: 'sess-1',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            }
            await store.setSession(session1)
            await store.addWallet(wallet1)
            await store.addWallet(wallet2)
            await store.setPrimaryWallet('party2')
            const primary1 = await store.getPrimaryWallet()
            expect(primary1?.partyId).toBe('party2')
            expect(primary1?.networkId).toBe('network1')

            // Switch to network2
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

        test('addWallet should upsert when same party exists on different network', async () => {
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
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)

            const auth2: AuthorizationCodeAuth = {
                method: 'authorization_code',
                clientId: 'cid',
                scope: 'scope',
                audience: 'aud',
            }
            const network2: Network = {
                name: 'testnet2',
                id: 'network2',
                synchronizerId: 'sync1::fingerprint',
                identityProviderId: 'idp1',
                description: 'Test Network 2',
                ledgerApi,
                auth: auth2,
            }
            await store.addNetwork(network2)

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

            const wallets = await store.getWallets()
            expect(wallets).toHaveLength(1)
            const allWallets = await store.getAllWallets({
                networkIds: ['network1', 'network2'],
            })
            expect(allWallets).toHaveLength(2)
            expect(
                allWallets.filter((w) => w.partyId === 'party1::namespace')
            ).toHaveLength(2)
            expect(
                allWallets.find((w) => w.networkId === 'network1')?.partyId
            ).toBe('party1::namespace')
            expect(
                allWallets.find((w) => w.networkId === 'network2')?.partyId
            ).toBe('party1::namespace')
        })

        test('should allow duplicate commandIds and update by transaction id', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'session-tx-immutable',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })

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

        test('paginate list transactions', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'session-tx-immutable',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })

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
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'session-tx-immutable',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })

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

        test('count correct number of transactions', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'session-tx-immutable',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })

            for (let i = 0; i < 10; i++) {
                const date =
                    i % 2 > 0 ? new Date(`2026-01-02T00:00:00.000Z`) : undefined

                const tx = addTx(`tx${i}`, date)

                await store.setTransaction(tx)
            }

            const count = await store.transactionsCount()
            expect(count).toBe(10)
        })

        test('removeWallet should cascade-delete userPartyRights', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'session-cascade-wallet',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })

            await store.addWallet({
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party-cascade-1',
                status: 'allocated',
                hint: 'hint',
                signingProviderId: 'participant',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
                rights: [PartyLevelRight.CanActAs],
            })

            const beforeRights = await db
                .selectFrom('userPartyRights')
                .selectAll()
                .execute()
            expect(beforeRights).toHaveLength(1)

            await store.removeWallet('party-cascade-1')

            const afterRights = await db
                .selectFrom('userPartyRights')
                .selectAll()
                .execute()
            expect(afterRights).toHaveLength(0)
        })

        test('removeNetwork should cascade-delete wallets and transactions', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'session-cascade-network',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })

            await store.addWallet({
                primary: false,
                userId: authContextMock.userId,
                partyId: 'party-cascade-2',
                status: 'allocated',
                hint: 'hint',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
                rights: [PartyLevelRight.CanActAs],
            })

            await store.setTransaction({
                id: 'tx-cascade-1',
                commandId: 'cmd-cascade-1',
                status: 'pending',
                preparedTransaction: 'prepared',
                preparedTransactionHash: 'hash',
                origin: 'https://localhost',
            })

            expect((await store.listNetworks()).map((n) => n.id)).toEqual([
                'network1',
            ])
            expect(await store.getWallets()).toHaveLength(1)
            expect((await store.listTransactions()).transactions).toHaveLength(
                1
            )

            await store.removeNetwork('network1')

            expect(await store.listNetworks()).toHaveLength(0)
            expect(
                await store.getAllWallets({ networkIds: ['network1'] })
            ).toHaveLength(0)
            const remainingTransactions = await db
                .selectFrom('transactions')
                .selectAll()
                .execute()
            expect(remainingTransactions).toHaveLength(0)
        })

        test('should manage idps and reject deletion when referenced by a network', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addIdp(idp2)
            await store.addNetwork(network)

            expect(await store.getIdp('idp1')).toEqual(idp)
            await store.updateIdp({ ...idp, issuer: 'https://issuer-updated' })
            expect(
                (await store.listIdps()).find(
                    (i): i is typeof idp => i.id === 'idp1'
                )?.issuer
            ).toBe('https://issuer-updated')

            await expect(store.addIdp(idp)).rejects.toThrow(
                'IDP idp1 already exists'
            )
            await expect(store.removeIdp('idp1')).rejects.toThrow(
                'Cannot delete IDP idp1 as it is in use'
            )

            await store.removeNetwork('network1')
            await store.removeIdp('idp1')
            expect(await store.listIdps()).toHaveLength(1)
        })

        test('should store a null issuer for self_issued idps', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            const selfIssuedIdp = {
                id: 'self-issued',
                type: 'self_issued' as const,
            }

            await store.addIdp(selfIssuedIdp)

            expect(
                await store.getIdp(selfIssuedIdp.id),
                "Doesn't throw if issuer is missing for self_issued"
            ).toEqual(selfIssuedIdp)
        })

        test('should clear issuer and config URL when changing an idp to self_issued', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            const id = 'changed-to-self-issued'

            await store.addIdp({
                id,
                type: 'oauth',
                issuer: 'https://issuer.example',
                configUrl:
                    'https://issuer.example/.well-known/openid-configuration',
            })
            await store.updateIdp({ id, type: 'self_issued' })

            expect(
                await db
                    .selectFrom('idps')
                    .select(['issuer', 'configUrl'])
                    .where('id', '=', id)
                    .executeTakeFirstOrThrow()
            ).toEqual({ issuer: null, configUrl: null })
        })

        test('should set and read user level rights for the current network', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'session-user-rights',
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

        test('should manage message signing requests', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'session-messages',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })

            const message: MessageRaw = {
                id: 'msg-1',
                status: 'pending',
                userId: authContextMock.userId,
                partyId: 'party-msg',
                publicKey: 'publicKey',
                message: 'hello',
                origin: 'https://dapp.example',
                createdAt: new Date('2026-03-01T10:00:00.000Z'),
            }

            await store.setMessageRaw(message)
            await store.setMessageRawStatus('msg-1', 'signed', {
                signedAt: new Date('2026-03-01T10:01:00.000Z'),
                signature: 'signature-bytes',
            })

            const fetched = await store.getMessageRaw('msg-1')
            expect(fetched?.status).toBe('signed')
            expect(fetched?.signature).toBe('signature-bytes')
            expect(await store.listMessageRaws()).toHaveLength(1)

            await store.removeMessageRaw('msg-1')
            expect(await store.getMessageRaw('msg-1')).toBeUndefined()
        })

        test('should reject message raw with mismatched userId', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'session-msg-mismatch',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })

            await expect(
                store.setMessageRaw({
                    id: 'msg-bad',
                    status: 'pending',
                    userId: 'other-user',
                    partyId: 'party-msg',
                    publicKey: 'publicKey',
                    message: 'hello',
                    origin: null,
                    createdAt: new Date(),
                })
            ).rejects.toThrow('MessageRaw userId mismatch')
        })

        test('should support latest transaction lookup and removal', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'session-tx-lookup',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })

            await store.setTransaction({
                id: 'tx-old',
                commandId: 'cmd-shared',
                status: 'pending',
                preparedTransaction: 'prepared-old',
                preparedTransactionHash: 'hash-old',
                createdAt: new Date('2026-01-01T00:00:00.000Z'),
                origin: 'https://dapp.example',
            })
            await store.setTransaction({
                id: 'tx-new',
                commandId: 'cmd-shared',
                status: 'pending',
                preparedTransaction: 'prepared-new',
                preparedTransactionHash: 'hash-new',
                createdAt: new Date('2026-01-02T00:00:00.000Z'),
                origin: 'https://dapp.example',
            })

            const latest =
                await store.getLatestTransactionByCommandId('cmd-shared')
            expect(latest?.id).toBe('tx-new')

            const signedAt = new Date('2026-01-02T00:01:00.000Z')
            await store.setTransactionSigned('tx-new', signedAt, 'ext-tx-1')
            expect((await store.getTransaction('tx-new'))?.externalTxId).toBe(
                'ext-tx-1'
            )

            await store.removeTransaction('tx-old')
            expect(await store.getTransaction('tx-old')).toBeUndefined()
            expect((await store.listTransactions()).transactions).toHaveLength(
                1
            )
        })

        test('should throw when updating a missing transaction or message', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.setSession({
                id: 'session-missing-updates',
                origin: 'dapp-1',
                network: 'network1',
                accessToken: 'test-access-token',
            })

            await expect(
                store.setTransactionStatus('missing-tx', 'failed')
            ).rejects.toThrow('Transaction not found')

            await expect(
                store.setMessageRawStatus('missing-msg', 'failed')
            ).rejects.toThrow('MessageRaw not found')
        })
    })
})
