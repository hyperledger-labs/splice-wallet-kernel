// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'
import { discover } from '@canton-network/core-wallet-ui-components'
import { assertProvider, ConnectError, ErrorCode } from '../error.js'
import * as storage from '../storage'
import { injectProvider } from './index'
import { GatewaysConfig } from '@canton-network/core-types'
import gateways from '../gateways.json'
import { clearAllLocalState } from '../util'

export async function connect(): Promise<dappAPI.StatusEvent> {
    const config: GatewaysConfig[] = gateways
    return discover(config)
        .then(async (result) => {
            // Store discovery result and remove previous session
            clearAllLocalState()

            storage.setKernelDiscovery(result)
            const provider = injectProvider(result)

            const response = await provider.request<dappAPI.StatusEvent>({
                method: 'connect',
            })

            if (response.session) {
                storage.setKernelSession(response)
            } else {
                console.warn('SDK: Connected without session', response)
            }

            return response
        })
        .catch((err) => {
            let details = ''
            if (typeof err === 'string') {
                details = err
            } else {
                details = JSON.stringify(err)

                if (err instanceof Error) {
                    details = err.message
                }

                if ('message' in err) {
                    details = err.message
                }
            }
            throw {
                status: 'error',
                error: ErrorCode.Other,
                details,
            } as ConnectError
        })
}

export async function disconnect(): Promise<dappAPI.Null> {
    try {
        const provider = assertProvider()
        return await provider.request<dappAPI.Null>({
            method: 'disconnect',
        })
    } catch {
        clearAllLocalState()
        return null
    }
}

export async function status(): Promise<dappAPI.StatusEvent> {
    return await assertProvider().request<dappAPI.StatusEvent>({
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
