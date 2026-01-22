// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, test } from '@jest/globals'

import { StoreInternal, StoreInternalConfig } from './StoreInternal'
import {
    Wallet,
    Session,
    Store,
    LedgerApi,
    Network,
} from '@canton-network/core-wallet-store'
import {
    AuthContext,
    AuthorizationCodeAuth,
    Idp,
} from '@canton-network/core-wallet-auth'
import { pino, Logger } from 'pino'
import { sink } from 'pino-test'

const authContextMock: AuthContext = {
    userId: 'test-user-id',
    accessToken: 'test-access-token',
}

const storeConfig: StoreInternalConfig = {
    idps: [],
    networks: [],
}

type StoreCtor = new (
    config: StoreInternalConfig,
    logger: Logger,
    authContext?: AuthContext
) => Store

const implementations: Array<[string, StoreCtor]> = [
    ['StoreInternal', StoreInternal],
]

implementations.forEach(([name, StoreImpl]) => {
    describe(name, () => {
        let store: Store

        beforeEach(() => {
            store = new StoreImpl(storeConfig, pino(sink()), authContextMock)
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
            await store.addWallet(wallet)
            const wallets = await store.getWallets()
            expect(wallets).toHaveLength(1)
        })

        test('should filter wallets', async () => {
            const wallet1: Wallet = {
                primary: false,
                partyId: 'party1',
                status: 'allocated',
                hint: 'hint1',
                signingProviderId: 'internal1',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const wallet2: Wallet = {
                primary: false,
                partyId: 'party2',
                status: 'allocated',
                hint: 'hint2',
                signingProviderId: 'internal2',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const wallet3: Wallet = {
                primary: false,
                partyId: 'party3',
                status: 'allocated',
                hint: 'hint3',
                signingProviderId: 'internal2',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network2',
            }
            await store.addWallet(wallet1)
            await store.addWallet(wallet2)
            await store.addWallet(wallet3)
            const getAllWallets = await store.getWallets()
            const getWalletsByNetworkId = await store.getWallets({
                networkIds: ['network1'],
            })
            const getWalletsBySigningProviderId = await store.getWallets({
                signingProviderIds: ['internal2'],
            })
            const getWalletsByNetworkIdAndSigningProviderId =
                await store.getWallets({
                    networkIds: ['network1'],
                    signingProviderIds: ['internal2'],
                })
            expect(getAllWallets).toHaveLength(3)
            expect(getWalletsByNetworkId).toHaveLength(2)
            expect(getWalletsBySigningProviderId).toHaveLength(2)
            expect(getWalletsByNetworkIdAndSigningProviderId).toHaveLength(1)
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
            // Set session so getCurrentNetwork() works
            const session: Session = {
                id: 'sess-123',
                network: 'network1',
                accessToken: 'token',
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
                network: 'net',
                accessToken: 'token',
            }
            await store.setSession(session)
            const result = await store.getSession()
            expect(result).toEqual(session)
            await store.removeSession()
            const removed = await store.getSession()
            expect(removed).toBeUndefined()
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
            // Add IdP if it doesn't exist, otherwise update it
            try {
                await store.addIdp(idp)
            } catch {
                // IdP already exists, update it instead
                await store.updateIdp(idp)
            }
            await store.updateNetwork(network)
            const listed = await store.listNetworks()
            expect(listed).toHaveLength(1)
            expect(listed[0].name).toBe('testnet')

            const fetched = await store.getNetwork('network1')
            expect(fetched.description).toBe('Test Network')

            await store.removeNetwork('network1')
            const afterRemove = await store.listNetworks()
            expect(afterRemove).toHaveLength(0)
        })

        test('should throw when getting a non-existent network', async () => {
            await expect(store.getNetwork('doesnotexist')).rejects.toThrow()
        })

        test('should throw when getting current network if none set', async () => {
            await expect(store.getCurrentNetwork()).rejects.toThrow()
        })

        test('should allow same party ID across different networks', async () => {
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
            await store.addWallet(wallet1)
            await store.addWallet(wallet2) // Should not throw
            const wallets = await store.getWallets()
            expect(wallets).toHaveLength(2)
            expect(
                wallets.filter((w) => w.partyId === 'party1::namespace')
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
            // Add IdP if it doesn't exist, otherwise update it
            try {
                await store.addIdp(idp)
            } catch {
                // IdP already exists, update it instead
                await store.updateIdp(idp)
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

            // Add IdP if it doesn't exist, otherwise update it
            try {
                await store.addIdp(idp)
            } catch {
                // IdP already exists, update it instead
                await store.updateIdp(idp)
            }
            await store.addNetwork(network1)
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
    })
})
