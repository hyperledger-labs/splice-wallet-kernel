// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    type JsonRpcRequest,
    type JsonRpcResponse,
    SpliceMessage,
    WalletEvent,
    type SpliceMessageEvent,
} from '@canton-network/core-types'

import { createProxyService } from '@webext-core/proxy-service'
import type { Methods } from '../background/dapp/rpc-gen'
import type { NotificationRelay } from './notification-relay'

/**
 * Proxies JSON-RPC requests, responses, between the dApp page (window message events),
 * and the background script (extension runtime messages)
 */
export function jsonRpcProxy(notificationRelay: NotificationRelay) {
    const runtimeId = browser.runtime?.id

    const shouldHandle = (target: string | undefined): boolean => {
        if (!target) return true
        if (!runtimeId) return false
        return target === runtimeId
    }

    window.addEventListener('message', async (event: SpliceMessageEvent) => {
        logger.info(`Content script received message: ${event.data}`)

        const { data: msg, success } = SpliceMessage.safeParse(event.data)

        if (!success) {
            // not a valid SpliceMessage, ignore
            return
        }

        // Forward JSON RPC requests to the background script
        if (msg.type === WalletEvent.SPLICE_WALLET_REQUEST) {
            if (!shouldHandle(msg.target)) return
            // Requests without an id are JSON-RPC notifications, e.g. the
            // ones the notification relay posts into this same window. They
            // must not be proxied back to the background script.
            if (msg.request.id == null) return

            // Proxy the message to the extension background script
            // and wait for the response
            const msgResponse = await processRequest(msg.request)

            logger.info('Received response from background: {*}', {
                msgResponse,
            })

            const response: SpliceMessage = {
                type: WalletEvent.SPLICE_WALLET_RESPONSE,
                response: msgResponse,
            }

            window.postMessage(response, '*')

            if ('result' in msgResponse) {
                notificationRelay.onResponse(
                    msg.request.method,
                    msgResponse.result
                )
            }
        }

        // Forward UI open requests to the background script
        if (msg.type === WalletEvent.SPLICE_WALLET_EXT_OPEN) {
            if (!shouldHandle(msg.target)) return
            await browser.runtime.sendMessage(msg)
        }

        // Acknowledge the extension readiness request
        if (msg.type === WalletEvent.SPLICE_WALLET_EXT_READY) {
            if (!shouldHandle(msg.target)) return
            window.postMessage(
                {
                    type: WalletEvent.SPLICE_WALLET_EXT_ACK,
                    target: msg.target,
                },
                '*'
            )
        }
    })
}

async function processRequest(
    request: JsonRpcRequest
): Promise<JsonRpcResponse> {
    logger.debug('Received request: {*}', { id: request.id, request })

    const { method, params } = request

    const controller = createProxyService(DAPP_RPC_KEY)

    const fn = controller[method as keyof Methods]
    if (fn === undefined) {
        throw new Error(`Method ${method} does not exist.`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await fn(params as any)

    logger.debug('Sending response: {*}', { id: request.id, result })

    return {
        jsonrpc: '2.0',
        id: request.id,
        result,
    }
}
