import { beforeEach, describe, expect, test } from '@jest/globals'

import { StoreInternal } from './StoreInternal'
import { Wallet, Session, Store } from './Store'
import { LedgerApi, Network, PasswordAuth, StoreConfig } from './config/schema'
import { AuthContext } from 'core-wallet-auth'

const authContextMock: AuthContext = {
    userId: 'test-user-id',
    accessToken: 'test-access-token',
}

const storeConfig: StoreConfig = {
    networks: [],
}

type StoreCtor = new (config: StoreConfig, authContext?: AuthContext) => Store

const implementations: Array<[string, StoreCtor]> = [
    ['StoreInternal', StoreInternal],
]

implementations.forEach(([name, StoreImpl]) => {
    describe(name, () => {
        let store: Store

        beforeEach(() => {
            store = new StoreImpl(storeConfig, authContextMock)
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
                chainId: 'network1',
            }
            const wallet2: Wallet = {
                primary: false,
                partyId: 'party2',
                hint: 'hint2',
                signingProviderId: 'internal2',
                publicKey: 'publicKey',
                namespace: 'namespace',
                chainId: 'network1',
            }
            const wallet3: Wallet = {
                primary: false,
                partyId: 'party3',
                hint: 'hint3',
                signingProviderId: 'internal2',
                publicKey: 'publicKey',
                namespace: 'namespace',
                chainId: 'network2',
            }
            await store.addWallet(wallet1)
            await store.addWallet(wallet2)
            await store.addWallet(wallet3)
            const getAllWallets = await store.getWallets()
            const getWalletsByChainId = await store.getWallets({
                chainIds: ['network1'],
            })
            const getWalletsBySigningProviderId = await store.getWallets({
                signingProviderIds: ['internal2'],
            })
            const getWalletsByChainIdAndSigningProviderId =
                await store.getWallets({
                    chainIds: ['network1'],
                    signingProviderIds: ['internal2'],
                })
            expect(getAllWallets).toHaveLength(3)
            expect(getWalletsByChainId).toHaveLength(2)
            expect(getWalletsBySigningProviderId).toHaveLength(2)
            expect(getWalletsByChainIdAndSigningProviderId).toHaveLength(1)
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
            const ledgerApi: LedgerApi = { baseUrl: 'http://api' }
            const auth: PasswordAuth = {
                type: 'password',
                issuer: 'http://auth',
                configUrl: 'http://auth/.well-known/openid-configuration',
                tokenUrl: 'http://auth',
                grantType: 'password',
                clientId: 'cid',
                scope: 'scope',
            }
            const network: Network = {
                name: 'testnet',
                chainId: 'network1',
                synchronizerId: 'sync1::fingerprint',
                description: 'Test Network',
                ledgerApi,
                auth,
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
    })
})
