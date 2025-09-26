// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { injectSpliceProvider } from '@canton-network/core-splice-provider'
import { DiscoverResult } from '@canton-network/core-types'
import { discover } from '@canton-network/core-wallet-ui-components'
import * as storage from '../storage'
import { openKernelUserUI, Provider } from '../provider'

export * from '@canton-network/core-splice-provider'
import * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'
import { ConnectError, ErrorCode } from '../index'

const injectProvider = (discovery: DiscoverResult) => {
    return injectSpliceProvider(
        new Provider(discovery, storage.getKernelSession()?.sessionToken)
    )
}

// On page load, restore and re-register the listener if needed
const discovery = storage.getKernelDiscovery()
if (discovery) injectProvider(discovery)

export async function open(): Promise<void> {
    const discovery = storage.getKernelDiscovery()
    if (!discovery) {
        throw new Error('No previous discovery found')
    }

    const session = storage.getKernelSession()
    if (!session) {
        throw new Error('No previous session found')
    }

    openKernelUserUI(discovery.walletType, session.userUrl ?? '')
}

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
