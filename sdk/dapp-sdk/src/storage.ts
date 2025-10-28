// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { DiscoverResult } from '@canton-network/core-types'
import * as dappAPI from '@canton-network/core-wallet-dapp-rpc-client'

enum LOCAL_STORAGE {
    KERNEL_DISCOVERY = 'splice_wallet_kernel_discovery',
    KERNEL_SESSION = 'splice_wallet_kernel_session',
}

export const getKernelDiscovery = (): DiscoverResult | undefined => {
    const discovery = localStorage.getItem(LOCAL_STORAGE.KERNEL_DISCOVERY)
    if (discovery) {
        try {
            return DiscoverResult.parse(JSON.parse(discovery))
        } catch (e) {
            console.error('Failed to parse stored kernel discovery:', e)
        }
    }
    return undefined
}

export const setKernelDiscovery = (discovery: DiscoverResult): void => {
    localStorage.setItem(
        LOCAL_STORAGE.KERNEL_DISCOVERY,
        JSON.stringify(discovery)
    )
}

export const removeKernelDiscovery = (): void => {
    localStorage.removeItem(LOCAL_STORAGE.KERNEL_DISCOVERY)
}

export const getKernelSession = (): dappAPI.ConnectResult | undefined => {
    const session = localStorage.getItem(LOCAL_STORAGE.KERNEL_SESSION)
    if (session) {
        try {
            return JSON.parse(session) as dappAPI.ConnectResult
        } catch (e) {
            console.error('Failed to parse stored kernel session:', e)
        }
    }
    return undefined
}

export const setKernelSession = (session: dappAPI.ConnectResult): void => {
    localStorage.setItem(LOCAL_STORAGE.KERNEL_SESSION, JSON.stringify(session))
}

export const removeKernelSession = (): void => {
    localStorage.removeItem(LOCAL_STORAGE.KERNEL_SESSION)
}
