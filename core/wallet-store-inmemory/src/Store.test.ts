// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
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
                hint: 'hint1',
                signingProviderId: 'internal1',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const wallet2: Wallet = {
                primary: false,
                partyId: 'party2',
                hint: 'hint2',
                signingProviderId: 'internal2',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const wallet3: Wallet = {
                primary: false,
                partyId: 'party3',
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
            const wallet1: Wallet = {
                primary: false,
                partyId: 'party1',
                hint: 'hint1',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            const wallet2: Wallet = {
                primary: false,
                partyId: 'party2',
                hint: 'hint2',
                signingProviderId: 'internal',
                publicKey: 'publicKey',
                namespace: 'namespace',
                networkId: 'network1',
            }
            await store.addWallet(wallet1)
            await store.addWallet(wallet2)
            await store.setPrimaryWallet('party2')
            const primary = await store.getPrimaryWallet()
            expect(primary?.partyId).toBe('party2')
            expect(primary?.primary).toBe(true)
        })

        test('should set and get session', async () => {
            const session: Session = { network: 'net', accessToken: 'token' }
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
            await store.addIdp(idp)
            await store.updateIdp(idp)
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
    })
})
