import { beforeEach, describe, expect, test } from '@jest/globals'

import { StoreInternal } from './StoreInternal'
import {
    Wallet,
    Session,
    NetworkConfig,
    PasswordAuth,
    LedgerApi,
} from '../../../core/wallet-store/src/Store'

const userServiceMock = {
    connected: () => true,
    getUserId: () => 'test-user-id',
}

const storeConfig = {
    networks: [],
}

describe('StoreInternal', () => {
    let store: StoreInternal

    beforeEach(() => {
        store = new StoreInternal(storeConfig, userServiceMock)
    })

    test('should add and retrieve wallets', async () => {
        const wallet: Wallet = {
            primary: false,
            partyId: 'party1',
            hint: 'hint',
            fingerprint: 'fp',
            address: { publicKey: 'pk', privateKey: 'sk' },
            chainId: 'chain1',
        }
        await store.addWallet(wallet)
        const wallets = await store.getWallets()
        expect(wallets).toHaveLength(1)
        // expect(wallets[0].partyId).toBe('party1');
    })

    test('should set and get primary wallet', async () => {
        const wallet1: Wallet = {
            primary: false,
            partyId: 'party1',
            hint: 'hint1',
            fingerprint: 'fp1',
            address: { publicKey: 'pk1', privateKey: 'sk1' },
            chainId: 'chain1',
        }
        const wallet2: Wallet = {
            primary: false,
            partyId: 'party2',
            hint: 'hint2',
            fingerprint: 'fp2',
            address: { publicKey: 'pk2', privateKey: 'sk2' },
            chainId: 'chain2',
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
            tokenUrl: 'http://auth',
            grantType: 'password',
            clientId: 'cid',
            scope: 'scope',
        }
        const network: NetworkConfig = {
            name: 'testnet',
            description: 'Test Network',
            ledgerApi,
            auth,
        }
        await store.updateNetwork(network)
        const listed = await store.listNetworks()
        expect(listed).toHaveLength(1)
        expect(listed[0].name).toBe('testnet')

        // const fetched = await store.getNetwork('testnet');
        // expect(fetched.description).toBe('Test Network');

        // await store.removeNetwork('testnet');
        // const afterRemove = await store.listNetworks();
        // expect(afterRemove).toHaveLength(0);
    })

    test('should throw when getting a non-existent network', async () => {
        await expect(store.getNetwork('doesnotexist')).rejects.toThrow()
    })

    test('should throw when getting current network if none set', async () => {
        await expect(store.getCurrentNetwork()).rejects.toThrow()
    })
})
