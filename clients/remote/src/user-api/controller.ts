// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import { LedgerClient } from 'core-ledger-client'
import buildController from './rpc-gen/index.js'
import {
    AddNetwork,
    AddNetworkParams,
    ExecuteParams,
    SignParams,
} from './rpc-gen/typings.js'
import { Store } from 'core-wallet-store'
import pino from 'pino'

export const userController = (store: Store, ledgerClient: LedgerClient) =>
    buildController({
        addNetwork: async (params: AddNetworkParams) =>
            Promise.resolve({} as AddNetwork),
        createWallet: async (params: {
            primary?: boolean
            partyHint: string
            networkId: string
            signingProviderId: string
        }) => {
            pino.pino().info('Allocating party with params:', params)
            try {
                const res = await ledgerClient.allocateParty({
                    partyIdHint: params.partyHint,
                })
                return res
            } catch (error) {
                pino.pino().error('Error allocating party:', error)
            }
            pino.pino().info('Allocating party with params:', params)
        },
        removeWallet: async (params: { partyId: string }) =>
            Promise.resolve({}),
        listWallets: async (params: {
            filter?: { networkIds?: string[]; signingProviderIds?: string[] }
        }) => Promise.resolve([]),
        sign: async (params: SignParams) =>
            Promise.resolve({
                signature: 'default-signature',
                signedBy: 'default-signed-by',
                party: 'default-party',
            }),
        execute: async (params: ExecuteParams) =>
            Promise.resolve({
                correlationId: 'default-correlation-id',
                traceId: 'default-trace-id',
            }),
        listNetworks: async () =>
            Promise.resolve({ networks: await store.listNetworks() }),
    })
