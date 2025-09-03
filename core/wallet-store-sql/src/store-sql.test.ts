// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, test } from '@jest/globals'

import { AuthContext } from '@canton-network/core-wallet-auth'
import {
    LedgerApi,
    Network,
    PasswordAuth,
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
    adminGrpcUrl: 'http://grpc',
}
const auth: PasswordAuth = {
    identityProviderId: 'idp1',
    type: 'password',
    issuer: 'http://auth',
    configUrl: 'http://auth/.well-known/openid-configuration',
    tokenUrl: 'http://auth',
    grantType: 'password',
    clientId: 'cid',
    scope: 'scope',
    audience: 'aud',
}
const network: Network = {
    name: 'testnet',
    chainId: 'network1',
    synchronizerId: 'sync1::fingerprint',
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
                hint: 'hint',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                chainId: 'network1',
            }
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addNetwork(network)
            await store.addWallet(wallet)
            const wallets = await store.getWallets()
            expect(wallets).toHaveLength(1)
        })

        test('should filter wallets', async () => {
            const auth2: PasswordAuth = {
                identityProviderId: 'idp2',
                type: 'password',
                issuer: 'http://auth',
                configUrl: 'http://auth/.well-known/openid-configuration',
                tokenUrl: 'http://auth',
                grantType: 'password',
                clientId: 'cid',
                scope: 'scope',
                audience: 'aud',
            }
            const network2: Network = {
                name: 'testnet',
                chainId: 'network2',
                synchronizerId: 'sync1::fingerprint',
                description: 'Test Network',
                ledgerApi,
                auth: auth2,
            }
            const wallet1: Wallet = {
                primary: false,
                partyId: 'party1',
                hint: 'hint1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                chainId: 'network1',
            }
            const wallet2: Wallet = {
                primary: false,
                partyId: 'party2',
                hint: 'hint2',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                chainId: 'network1',
            }
            const wallet3: Wallet = {
                primary: false,
                partyId: 'party3',
                hint: 'hint3',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                chainId: 'network2',
            }
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addNetwork(network)
            await store.addNetwork(network2)
            await store.addWallet(wallet1)
            await store.addWallet(wallet2)
            await store.addWallet(wallet3)
            const getAllWallets = await store.getWallets()
            const getWalletsByChainId = await store.getWallets({
                chainIds: ['network1'],
            })
            const getWalletsBySigningProviderId = await store.getWallets({
                signingProviderIds: ['internal'],
            })
            const getWalletsByChainIdAndSigningProviderId =
                await store.getWallets({
                    chainIds: ['network1'],
                    signingProviderIds: ['internal'],
                })
            expect(getAllWallets).toHaveLength(3)
            expect(getWalletsByChainId).toHaveLength(2)
            expect(getWalletsBySigningProviderId).toHaveLength(3)
            expect(getWalletsByChainIdAndSigningProviderId).toHaveLength(2)
        })

        test('should set and get primary wallet', async () => {
            const wallet1: Wallet = {
                primary: false,
                partyId: 'party1',
                hint: 'hint1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                chainId: 'network1',
            }
            const wallet2: Wallet = {
                primary: false,
                partyId: 'party2',
                hint: 'hint2',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                chainId: 'network1',
            }
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addNetwork(network)
            await store.addWallet(wallet1)
            await store.addWallet(wallet2)
            await store.setPrimaryWallet('party2')
            const primary = await store.getPrimaryWallet()
            expect(primary?.partyId).toBe('party2')
            expect(primary?.primary).toBe(true)
        })

        test('should set and get session', async () => {
            const store = new StoreImpl(db, pino(sink()), authContextMock)
            await store.addNetwork(network)
            const session: Session = {
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
    })
})
