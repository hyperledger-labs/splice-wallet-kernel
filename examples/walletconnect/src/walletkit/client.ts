// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Core } from '@walletconnect/core'
import { WalletKit } from '@reown/walletkit'

let instance: InstanceType<typeof WalletKit> | null = null
let initPromise: Promise<InstanceType<typeof WalletKit>> | null = null

export function getWalletKit(): InstanceType<typeof WalletKit> | null {
    return instance
}

export function initWalletKit(
    projectId: string
): Promise<InstanceType<typeof WalletKit>> {
    if (instance) return Promise.resolve(instance)
    if (initPromise) return initPromise

    initPromise = (async () => {
        const core = new Core({ projectId })

        const wk = await WalletKit.init({
            core,
            metadata: {
                name: 'Canton Wallet Example',
                description: 'Standalone Canton WalletConnect wallet',
                url: window.location.origin,
                icons: [],
            },
        })

        instance = wk
        console.log('[WalletKit] Initialized')
        return wk
    })()

    return initPromise
}
