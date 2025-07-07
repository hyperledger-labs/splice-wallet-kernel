// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import { AuthContext } from 'core-wallet-auth'
import buildController from './rpc-gen/index.js'
import {
    KernelInfo,
    LedgerApiParams,
    PrepareExecuteParams,
    PrepareReturnParams,
} from './rpc-gen/typings.js'
import { Store } from 'core-wallet-store'

const kernelInfo: KernelInfo = {
    id: 'remote-da',
    clientType: 'remote',
    url: 'http://localhost:3000/rpc',
}

export const dappController = (store: Store, context?: AuthContext) =>
    buildController({
        connect: async () =>
            Promise.resolve({
                kernel: kernelInfo,
                isConnected: false,
                chainId: 'default-chain-id',
                userUrl: 'http://localhost:3002/login/',
            }),
        darsAvailable: async () => Promise.resolve({ dars: ['default-dar'] }),
        ledgerApi: async (params: LedgerApiParams) =>
            Promise.resolve({ response: 'default-response' }),
        prepareExecute: async (params: PrepareExecuteParams) => null,
        prepareReturn: async (params: PrepareReturnParams) =>
            Promise.resolve({}),
        status: async () => {
            if (context === null) {
                return Promise.resolve({
                    kernel: kernelInfo,
                    isConnected: false,
                })
            } else {
                return Promise.resolve({
                    kernel: kernelInfo,
                    isConnected: true,
                    chainId: (await store.getCurrentNetwork()).name,
                })
            }
        },
        onConnected: async () => {
            throw new Error('Function not implemented.')
        },
    })
