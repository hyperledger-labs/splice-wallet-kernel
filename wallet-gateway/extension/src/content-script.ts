// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    SpliceMessage,
    SpliceMessageEvent,
    WalletEvent,
} from '@canton-network/core-types'
import Browser from 'webextension-polyfill'

const runtimeId = Browser.runtime?.id
const shouldHandle = (target: string | undefined): boolean => {
    if (!target) return true
    if (!runtimeId) return false
    return target === runtimeId
}

window.addEventListener('canton:requestProvider', () => {
    if (!runtimeId) return
    window.dispatchEvent(
        new CustomEvent('canton:announceProvider', {
            detail: {
                id: runtimeId,
                name: 'Splice Wallet Gateway',
                target: runtimeId,
            },
        })
    )
})

// Handle incoming RPC requests from the dapp,
// proxy them to the extension background script,
// and send the response back to the dapp
window.addEventListener('message', async (event: SpliceMessageEvent) => {
    console.log('Content script received message:', event.data)

    const { data: msg, success } = SpliceMessage.safeParse(event.data)

    if (!success) {
        // not a valid SpliceMessage, ignore
        return
    }

    // Forward JSON RPC requests to the background script
    if (msg.type === WalletEvent.SPLICE_WALLET_REQUEST) {
        if (!shouldHandle(msg.target)) return

        // Proxy the message to the extension background script
        // and wait for the response
        const msgResponse = await Browser.runtime.sendMessage(msg)

        console.log('Received response from background:', msgResponse)
        const response = SpliceMessage.parse(msgResponse)

        window.postMessage(response, '*')
    }

    // Forward UI open requests to the background script
    if (msg.type === WalletEvent.SPLICE_WALLET_EXT_OPEN) {
        if (!shouldHandle(msg.target)) return
        await Browser.runtime.sendMessage(msg)
    }

    // Acknowledge the extension readiness request
    if (msg.type === WalletEvent.SPLICE_WALLET_EXT_READY) {
        if (!shouldHandle(msg.target)) return
        window.postMessage(
            { type: WalletEvent.SPLICE_WALLET_EXT_ACK, target: msg.target },
            '*'
        )
    }
})
