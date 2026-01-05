// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { DiscoverResult, GatewaysConfig } from '@canton-network/core-types'
import { Discovery } from '../components/Discovery.js'
import { popup } from './popup.js'

export async function discover(
    config: GatewaysConfig[]
): Promise<DiscoverResult> {
    const win = await popup(Discovery, {
        title: 'Wallet Discovery',
        target: 'wallet-discovery',
    })

    win.onload = () => {
        win.postMessage(
            { type: 'SPLICE_WALLET_CONFIG_LOAD', payload: config },
            '*'
        )
    }

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
                win.close()
            }
        }

        window.addEventListener('message', handler)
    })
}
