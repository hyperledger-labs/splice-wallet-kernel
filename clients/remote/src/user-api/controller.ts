// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import buildController from './rpc-gen/index.js'
import {
    AddNetwork,
    AddNetworkParams,
    ExecuteParams,
    SignParams,
} from './rpc-gen/typings.js'
import { Store } from 'core-wallet-store'

export const userController = (store: Store) =>
    buildController({
        addNetwork: async (params: AddNetworkParams) =>
            Promise.resolve({} as AddNetwork),
        allocateParty: async (params: { hint: string }) => Promise.resolve({}),
        removeParty: async (params: { hint: string }) => Promise.resolve({}),
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
