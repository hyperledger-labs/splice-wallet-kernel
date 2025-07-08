// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */

import Browser from 'webextension-polyfill'
import buildController from './rpc-gen'
import {
    KernelInfo,
    LedgerApiParams,
    PrepareExecuteParams,
    PrepareReturnParams,
} from './rpc-gen/typings.js'

import { Store } from 'core-wallet-store'

const kernelInfo: KernelInfo = {
    id: 'default-kernel-id',
    clientType: 'browser',
}

// TODO: Make store required
export const dappController = (store?: Store) =>
    buildController({
        connect: async () =>
            Promise.resolve({
                kernel: kernelInfo,
                isConnected: false,
                chainId: 'default-chain-id',
                userUrl: Browser.runtime.getURL('pages/user.html'),
            }),
        darsAvailable: async () => Promise.resolve({ dars: ['default-dar'] }),
        ledgerApi: async (params: LedgerApiParams) =>
            Promise.resolve({ response: 'default-response' }),
        prepareExecute: async (params: PrepareExecuteParams) =>
            Promise.resolve({ userUrl: 'default-url' }),
        prepareReturn: async (params: PrepareReturnParams) =>
            Promise.resolve({}),
        status: async () => {
            throw new Error('Function not implemented.')
        },
        onConnected: async () => {
            throw new Error('Function not implemented.')
        },
    })
