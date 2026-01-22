// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from '@jest/globals'

import {
    AuthContext,
    AuthorizationCodeAuth,
    Idp,
} from '@canton-network/core-wallet-auth'
import {
    LedgerApi,
    Network,
    Session,
    Wallet,
} from '@canton-network/core-wallet-store'
import { Kysely } from 'kysely'
import { Logger, pino } from 'pino'
import { sink } from 'pino-test'
import { migrator } from './migrator'
import { DB } from './schema'
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
                partyId: 'party1',
                status: 'allocated',
                hint: 'hint',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.addWallet(wallet)
            const wallets = await store.getWallets()
            expect(wallets).toHaveLength(1)
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
                partyId: 'party1',
                status: 'allocated',
                hint: 'hint1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const wallet2: Wallet = {
                primary: false,
                partyId: 'party2',
                status: 'allocated',
                hint: 'hint2',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const wallet3: Wallet = {
                primary: false,
                partyId: 'party3',
                status: 'allocated',
                hint: 'hint3',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network2',
            }
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addIdp(idp2)
            await store.addNetwork(network)
            await store.addNetwork(network2)
            await store.addWallet(wallet1)
            await store.addWallet(wallet2)
            await store.addWallet(wallet3)
            const getAllWallets = await store.getWallets()
            const getWalletsByNetworkId = await store.getWallets({
                networkIds: ['network1'],
            })
            const getWalletsBySigningProviderId = await store.getWallets({
                signingProviderIds: ['internal'],
            })
            const getWalletsByNetworkIdAndSigningProviderId =
                await store.getWallets({
                    networkIds: ['network1'],
                    signingProviderIds: ['internal'],
                })
            expect(getAllWallets).toHaveLength(3)
            expect(getWalletsByNetworkId).toHaveLength(2)
            expect(getWalletsBySigningProviderId).toHaveLength(3)
            expect(getWalletsByNetworkIdAndSigningProviderId).toHaveLength(2)
        })

        test('should set and get primary wallet', async () => {
            const wallet1: Wallet = {
                primary: false,
                partyId: 'party1',
                status: 'allocated',
                hint: 'hint1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const wallet2: Wallet = {
                primary: false,
                partyId: 'party2',
                status: 'allocated',
                hint: 'hint2',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            // Set session so getCurrentNetwork() works
            const session: Session = {
                id: 'sess-123',
                network: 'network1',
                accessToken: 'token',
            }
            await store.setSession(session)
            await store.addWallet(wallet1)
            await store.addWallet(wallet2)
            await store.setPrimaryWallet('party2')
            const primary = await store.getPrimaryWallet()
            expect(primary?.partyId).toBe('party2')
            expect(primary?.primary).toBe(true)
        })

        test('should set and get session', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            const session: Session = {
                id: 'sess-123',
                network: 'network1',
                accessToken: 'token',
            }
            await store.setSession(session)
            const result = await store.getSession()
            expect(result).toEqual({
                ...session,
                userId: authContextMock.userId,
            })
            await store.removeSession()
            const removed = await store.getSession()
            expect(removed).toBeUndefined()
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
                partyId: 'party1::namespace',
                status: 'allocated',
                hint: 'party1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const wallet2: Wallet = {
                primary: false,
                partyId: 'party1::namespace', // Same party ID
                status: 'allocated',
                hint: 'party1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network2', // Different network
            }
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.addNetwork(network2)
            await store.addWallet(wallet1)
            await store.addWallet(wallet2) // Should not throw
            const wallets = await store.getWallets()
            expect(wallets).toHaveLength(2)
            expect(
                wallets.filter((w) => w.partyId === 'party1::namespace')
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
                partyId: 'party1',
                status: 'allocated',
                hint: 'hint1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const wallet2: Wallet = {
                primary: false,
                partyId: 'party2',
                status: 'allocated',
                hint: 'hint2',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const wallet3: Wallet = {
                primary: false,
                partyId: 'party3',
                status: 'allocated',
                hint: 'hint3',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network2',
            }
            const wallet4: Wallet = {
                primary: false,
                partyId: 'party4',
                status: 'allocated',
                hint: 'hint4',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network2',
            }
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)
            await store.addNetwork(network2)

            // Set session for network1
            const session1: Session = {
                id: 'sess-1',
                network: 'network1',
                accessToken: 'token',
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
                network: 'network2',
                accessToken: 'token',
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
                partyId: 'party1::namespace',
                status: 'allocated',
                hint: 'party1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const wallet2: Wallet = {
                primary: false,
                partyId: 'party1::namespace', // Same party ID
                status: 'allocated',
                hint: 'party1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network2', // Different network
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
                network: 'network1',
                accessToken: 'token',
            }
            await store.setSession(session1)
            await store.addWallet(wallet1)

            // Switch to network2 and add same party
            const session2: Session = {
                id: 'sess-2',
                network: 'network2',
                accessToken: 'token',
            }
            await store.setSession(session2)
            await store.addWallet(wallet2) // Should not throw, should create new entry

            const wallets = await store.getWallets()
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

        test('addWallet should update userId when same party+network exists with different user', async () => {
            const wallet1: Wallet = {
                primary: false,
                partyId: 'party1::namespace',
                status: 'allocated',
                hint: 'party1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addIdp(idp)
            await store.addNetwork(network)

            const session: Session = {
                id: 'sess-123',
                network: 'network1',
                accessToken: 'token',
            }
            await store.setSession(session)
            await store.addWallet(wallet1)

            // Create new store with different user
            const authContext2: AuthContext = {
                userId: 'test-user-id-2',
                accessToken: 'test-access-token-2',
            }
            const store2 = new StoreImpl(db, pino(sink()), authContext2)
            await store2.setSession(session)

            // Add same wallet (same party+network) - should update userId
            await store2.addWallet(wallet1)

            const wallets = await store2.getWallets()
            expect(wallets).toHaveLength(1)
            expect(wallets[0].partyId).toBe('party1::namespace')
            expect(wallets[0].networkId).toBe('network1')
        })
    })
})
