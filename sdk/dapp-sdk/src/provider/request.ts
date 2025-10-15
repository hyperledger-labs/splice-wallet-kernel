// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'
import { discover } from '@canton-network/core-wallet-ui-components'
import { assertProvider, ConnectError, ErrorCode } from '../error.js'
import * as storage from '../storage'
import { injectProvider } from './index'

export async function connect(): Promise<dappAPI.ConnectResult> {
    return discover()
        .then(async (result) => {
            // Store discovery result and remove previous session
            storage.setKernelDiscovery(result)
            storage.removeKernelSession()
            const provider = injectProvider(result)

            const response = await provider.request<dappAPI.ConnectResult>({
                method: 'connect',
            })

            if (!response.isConnected) {
                // TODO: error dialog
                console.error('SDK: Not connected', response)
                // openKernelUserUI(result.walletType, response.userUrl)
            } else {
                console.log('SDK: Store connection', response)
                storage.setKernelSession(response)
            }

            return response
        })
        .catch((err) => {
            throw {
                status: 'error',
                error: ErrorCode.Other,
                details: err instanceof Error ? err.message : String(err),
            } as ConnectError
        })
}

export async function status(): Promise<dappAPI.StatusResult> {
    return await assertProvider().request<dappAPI.StatusResult>({
        method: 'status',
    })
}

export async function darsAvailable(): Promise<dappAPI.DarsAvailableResult> {
    return await assertProvider().request<dappAPI.DarsAvailableResult>({
        method: 'darsAvailable',
    })
}

export async function requestAccounts(): Promise<dappAPI.RequestAccountsResult> {
    return await assertProvider().request<dappAPI.RequestAccountsResult>({
        method: 'requestAccounts',
    })
}

export async function prepareExecute(
    params: dappAPI.PrepareExecuteParams
): Promise<dappAPI.PrepareExecuteResult> {
    return await assertProvider().request<dappAPI.PrepareExecuteResult>({
        method: 'prepareExecute',
        params,
    })
}

export async function ledgerApi(
    params: dappAPI.LedgerApiParams
): Promise<dappAPI.LedgerApiResult> {
    return await assertProvider().request<dappAPI.LedgerApiResult>({
        method: 'ledgerApi',
        params,
    })
}
