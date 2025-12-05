// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
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

import { Store } from '@canton-network/core-wallet-store'

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
                isNetworkConnected: false,
                networkReason: 'Unauthenticated',
                userUrl: Browser.runtime.getURL('pages/user.html'),
                network: {
                    networkId: 'default-network-id',
                    ledgerApi: {
                        baseUrl: 'http://default-ledger-api',
                    },
                },
                session: {
                    accessToken: 'default-access-token',
                    userId: 'default-user-id',
                },
            }),
        disconnect: async () => Promise.resolve(null),
        darsAvailable: async () => Promise.resolve({ dars: ['default-dar'] }),
        ledgerApi: async (params: LedgerApiParams) =>
            Promise.resolve({ response: 'default-response' }),
        prepareExecute: async (params: PrepareExecuteParams) => {
            throw new Error('Function not implemented.')
        },
        prepareReturn: async (params: PrepareReturnParams) =>
            Promise.resolve({}),
        status: async () => {
            throw new Error('Function not implemented.')
        },
        requestAccounts: async () => {
            const wallets = await store!.getWallets()
            return wallets
        },
        onAccountsChanged: async () => {
            throw new Error('Only for events.')
        },
        onTxChanged: async () => {
            throw new Error('Only for events.')
        },
    })
