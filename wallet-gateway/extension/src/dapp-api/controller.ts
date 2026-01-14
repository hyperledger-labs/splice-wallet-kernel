// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */

import Browser from 'webextension-polyfill'
import buildController from './rpc-gen'
import {
    KernelInfo,
    LedgerApiParams,
    Network,
    PrepareExecuteParams,
    SignMessageParams,
    SignMessageResult,
    Wallet,
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
        ledgerApi: async (params: LedgerApiParams) =>
            Promise.resolve({ response: 'default-response' }),
        prepareExecute: async (params: PrepareExecuteParams) => {
            throw new Error('Function not implemented.')
        },
        status: async () => {
            throw new Error('Function not implemented.')
        },
        listAccounts: async () => {
            const wallets = await store!.getWallets()
            return wallets
        },
        accountsChanged: async () => {
            throw new Error('Only for events.')
        },
        txChanged: async () => {
            throw new Error('Only for events.')
        },
        getActiveNetwork: function (): Promise<Network> {
            throw new Error('Function not implemented.')
        },
        signMessage: function (
            params: SignMessageParams
        ): Promise<SignMessageResult> {
            throw new Error('Function not implemented.')
        },
        getPrimaryAccount: async function (): Promise<Wallet> {
            throw new Error('Function not implemented.')
        },
    })
