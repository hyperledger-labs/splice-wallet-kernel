// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { DiscoverResult, GatewaysConfig } from '@canton-network/core-types'
import { Discovery } from '../components/Discovery.js'
import { popup } from './popup.js'

export async function discover(
    verifiedGateways: GatewaysConfig[]
): Promise<DiscoverResult> {
    const win = popup.open(Discovery, {
        title: 'Connect to a Wallet Gateway',
    })

    localStorage.setItem(
        'splice_wallet_verified_gateways',
        JSON.stringify(verifiedGateways)
    )

    return new Promise((resolve, reject) => {
        let response: DiscoverResult | undefined = undefined

        win.addEventListener('beforeunload', () => {
            if (response === undefined) {
                console.log('Wallet discovery window closed by user')
                reject('User closed the wallet discovery window')
            }
        })

        const handler = (event: MessageEvent) => {
            if (
                event.origin === window.location.origin &&
                typeof event.data.walletType === 'string'
            ) {
                response = event.data
                resolve({
                    url: event.data.url,
                    walletType: event.data.walletType,
                })
                window.removeEventListener('message', handler)
            }
        }

        window.addEventListener('message', handler)
    })
}
