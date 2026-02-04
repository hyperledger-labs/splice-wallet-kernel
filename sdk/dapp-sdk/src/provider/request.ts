// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'
import { discover } from '@canton-network/core-wallet-ui-components'
import { assertProvider, ConnectError, ErrorCode } from '../error.js'
import * as storage from '../storage'
import { injectProvider } from './index'
import { GatewaysConfig } from '@canton-network/core-types'
import gateways from '../gateways.json'
import { clearAllLocalState } from '../util'

interface ConnectOptions {
    defaultGateways?: GatewaysConfig[]
    additionalGateways?: GatewaysConfig[]
}

export async function connect(
    options?: ConnectOptions
): Promise<dappAPI.StatusEvent> {
    const { defaultGateways = gateways, additionalGateways = [] } =
        options || {}

    const verifiedGateways: GatewaysConfig[] = [
        ...defaultGateways,
        ...additionalGateways,
    ]

    return discover(verifiedGateways)
        .then(async (result) => {
            // Store discovery result and remove previous session
            clearAllLocalState()

            storage.setKernelDiscovery(result)
            const provider = injectProvider(result)

            const response = await provider.request({
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
        await provider.request<dappAPI.Null>({
            method: 'disconnect',
        })
    } finally {
        clearAllLocalState({ closePopup: true })
    }

    return null
}

export async function status(): Promise<dappAPI.StatusEvent> {
    return await assertProvider().request<dappAPI.StatusEvent>({
        method: 'status',
    })
}

export async function listAccounts(): Promise<dappAPI.ListAccountsResult> {
    return await assertProvider().request<dappAPI.ListAccountsResult>({
        method: 'listAccounts',
    })
}

export async function prepareExecute(
    params: dappAPI.PrepareExecuteParams
): Promise<null> {
    return await assertProvider().request({
        method: 'prepareExecute',
        params,
    })
}

export async function prepareExecuteAndWait(
    params: dappAPI.PrepareExecuteParams
): Promise<dappAPI.PrepareExecuteAndWaitResult> {
    return await assertProvider().request<dappAPI.PrepareExecuteAndWaitResult>({
        method: 'prepareExecuteAndWait',
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
