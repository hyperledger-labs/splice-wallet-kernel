import { beforeEach, describe, expect, test } from '@jest/globals'

import { StoreInternal } from './StoreInternal'
import {
    Wallet,
    Session,
    NetworkConfig,
    PasswordAuth,
    LedgerApi,
} from '../../../core/wallet-store/src/Store'

const authContextMock = {
    userId: 'test-user-id',
}

const storeConfig = {
    networks: [],
}

describe('StoreInternal', () => {
    let store: StoreInternal

    beforeEach(() => {
        store = new StoreInternal(storeConfig, authContextMock)
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
        const ledgerApi: LedgerApi = { baseUrl: 'http://api' }
        const auth: PasswordAuth = {
            type: 'password',
            tokenUrl: 'http://auth',
            grantType: 'password',
            clientId: 'cid',
            scope: 'scope',
        }
        const network: NetworkConfig = {
            name: 'testnet',
            networkId: 'network1',
            description: 'Test Network',
            ledgerApi,
            auth,
        }
        await store.updateNetwork(network)
        const listed = await store.listNetworks()
        expect(listed).toHaveLength(1)
        expect(listed[0].name).toBe('testnet')

        const fetched = await store.getNetwork('testnet')
        expect(fetched.description).toBe('Test Network')

        await store.removeNetwork('testnet')
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
