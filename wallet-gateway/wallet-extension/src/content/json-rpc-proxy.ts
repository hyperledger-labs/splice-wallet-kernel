// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { toJsonRpcError } from '@canton-network/core-rpc-errors'
import {
    type JsonRpcRequest,
    type JsonRpcResponse,
    SpliceMessage,
    WalletEvent,
} from '@canton-network/core-types'
import { createProxyService } from '@webext-core/proxy-service'
import { browser } from 'wxt/browser'
import type { DappDispatcher } from '@/background/controllers/dapp/dispatch'
import { logger } from '@/shared/logger'
import { DAPP_RPC_KEY } from '@/shared/service-keys'
import type { NotificationRelay } from './notification-relay'

export interface JsonRpcProxyOptions {
    /** The background dApp dispatcher. */
    dispatcher: Pick<DappDispatcher, 'request'>
    /** Forwards a message to the background (`runtime.sendMessage`). */
    sendMessage: (message: SpliceMessage) => Promise<unknown>
    notificationRelay: Pick<NotificationRelay, 'onResponse'>
    /** The dApp page window requests come from and responses go to. */
    window: Pick<Window, 'postMessage'>
    /** The page origin, sent with each request. */
    origin: string
    /** Routing key of this extension, see `SpliceMessage.target`. */
    runtimeId: string | undefined
}

/**
 * Handles the page's `message` events: proxies JSON-RPC requests to the
 * background dispatcher and posts the responses back. Every request with an
 * id gets a response, even when the background can't be reached.
 *
 * Request and response payloads are never logged, because they can carry the
 * access token.
 */
export function createJsonRpcProxyHandler(options: JsonRpcProxyOptions) {
    const { dispatcher, notificationRelay, runtimeId, window } = options

    const shouldHandle = (target: string | undefined): boolean => {
        if (!target) return true
        if (!runtimeId) return false
        return target === runtimeId
    }

    async function dispatch(request: JsonRpcRequest): Promise<JsonRpcResponse> {
        try {
            return await dispatcher.request(request, options.origin)
        } catch (error) {
            // e.g. "Extension context invalidated" after an extension reload
            return {
                jsonrpc: '2.0',
                id: request.id ?? null,
                error: toJsonRpcError(error).serialize(),
            }
        }
    }

    return async (event: Pick<MessageEvent, 'data' | 'source'>) => {
        // Only the page itself, not a frame posting to its parent: the
        // background attributes every request to this page's origin.
        if (event.source !== window) return

        const { data: msg, success } = SpliceMessage.safeParse(event.data)
        if (!success) return

        switch (msg.type) {
            case WalletEvent.SPLICE_WALLET_REQUEST: {
                if (!shouldHandle(msg.target)) return
                // Requests without an id are JSON-RPC notifications, e.g. the
                // ones the notification relay posts into this same window.
                // They must not be proxied back to the background script.
                if (msg.request.id == null) return

                const response = await dispatch(msg.request)
                window.postMessage(
                    {
                        type: WalletEvent.SPLICE_WALLET_RESPONSE,
                        response,
                    } satisfies SpliceMessage,
                    '*'
                )

                if ('result' in response) {
                    notificationRelay.onResponse(
                        msg.request.method,
                        response.result
                    )
                }
                return
            }
            case WalletEvent.SPLICE_WALLET_EXT_OPEN:
                // The background opens the wallet UI
                if (!shouldHandle(msg.target)) return
                options.sendMessage(msg).catch((error: unknown) => {
                    logger.warn('Unable to open the wallet UI: {error}', {
                        error,
                    })
                })
                return
            case WalletEvent.SPLICE_WALLET_EXT_READY:
                // Acknowledge the extension readiness request
                if (!shouldHandle(msg.target)) return
                window.postMessage(
                    {
                        type: WalletEvent.SPLICE_WALLET_EXT_ACK,
                        target: msg.target,
                    } satisfies SpliceMessage,
                    '*'
                )
                return
        }
    }
}

/**
 * Proxies JSON-RPC requests and responses between the dApp page (window
 * message events) and the background script (extension runtime messages).
 */
export function jsonRpcProxy(notificationRelay: NotificationRelay): void {
    const handle = createJsonRpcProxyHandler({
        dispatcher: createProxyService(DAPP_RPC_KEY),
        sendMessage: (message) => browser.runtime.sendMessage(message),
        notificationRelay,
        window,
        origin: location.origin,
        runtimeId: browser.runtime?.id,
    })
    window.addEventListener('message', (event: MessageEvent) => {
        void handle(event)
    })
}
