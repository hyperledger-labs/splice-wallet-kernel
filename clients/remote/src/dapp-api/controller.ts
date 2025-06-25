// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import buildController from './rpc-gen/index.js'
import {
    LedgerApiParams,
    PrepareExecuteParams,
    PrepareReturnParams,
} from './rpc-gen/typings.js'
import { Store } from 'core-wallet-store'

export const dappController = (store: Store) =>
    buildController({
        connect: async () =>
            Promise.resolve({
                chainId: 'default-chain-id',
                userUrl: 'http://localhost:3002/login',
            }),
        darsAvailable: async () => Promise.resolve({ dars: ['default-dar'] }),
        ledgerApi: async (params: LedgerApiParams) =>
            Promise.resolve({ response: 'default-response' }),
        prepareExecute: async (params: PrepareExecuteParams) => null,
        prepareReturn: async (params: PrepareReturnParams) =>
            Promise.resolve({}),
    })
