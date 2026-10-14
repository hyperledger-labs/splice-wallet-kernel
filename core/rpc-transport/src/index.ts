// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid'
import {
    type RequestPayload,
    type ResponsePayload,
    type JsonRpcRequest,
    type SpliceMessage,
    WalletEvent,
    isSpliceMessageEvent,
    SuccessResponse,
    ErrorResponse,
    type JsonRpcResponse,
} from '@canton-network/core-types'
import {
    providerErrors,
    rpcErrors,
    toJsonRpcError,
} from '@canton-network/core-rpc-errors'

export const jsonRpcRequest = (
    id: string | number | null,
    payload: RequestPayload
): JsonRpcRequest => {
    return {
        jsonrpc: '2.0',
        id, // id should be set based on the request context
        ...payload,
    }
}

export const jsonRpcResponse = (
    id: string | number | null,
    payload: ResponsePayload
): JsonRpcResponse => {
    return {
        jsonrpc: '2.0',
        id, // id should be set based on the request context
        ...payload,
    }
}

export interface RpcTransport {
    /** Rejects with a `JsonRpcError` when the wallet answers with an error. */
    submit: (payload: RequestPayload) => Promise<SuccessResponse>
}

/**
 * Handler for wallet-pushed JSON-RPC notifications (CIP-103 events such as
 * txChanged / accountsChanged / statusChanged / connected).
 */
export type NotificationHandler = (method: string, params?: unknown) => void

export type WindowTransportOptions = {
    /**
     * Optional routing key for browser-extension messaging. When set, extensions
     * should ignore messages that do not match their own identifier.
     */
    target?: string | undefined
}

export class WindowTransport implements RpcTransport {
    private notificationHandlers = new Set<NotificationHandler>()
    private notificationListener: ((event: MessageEvent) => void) | undefined

    constructor(
        private win: Window,
        private options: WindowTransportOptions = {}
    ) {}

    /**
     * Subscribe to wallet-pushed JSON-RPC notifications: SPLICE_WALLET_REQUEST
     * frames with no `id` (JSON-RPC 2.0 §4.1). The window listener must be
     * always-on for the transport's lifetime — CIP-103 events arrive between
     * requests, where a per-request listener can never observe them.
     */
    onNotification = (handler: NotificationHandler): (() => void) => {
        this.notificationHandlers.add(handler)
        if (!this.notificationListener) {
            this.notificationListener = (event: MessageEvent) => {
                if (
                    !isSpliceMessageEvent(event) ||
                    event.data.type !== WalletEvent.SPLICE_WALLET_REQUEST
                ) {
                    return
                }
                // Requests submitted by this transport always carry a uuid id,
                // so an id-less request can only be a wallet-originated
                // notification — this also keeps the dApp's own outgoing
                // frames (posted to the same window) out of the event path.
                if (event.data.request.id != null) {
                    return
                }
                // Same gating as extension detection: a transport constructed
                // from an announced provider's routing key only accepts frames
                // stamped with that key, so multi-wallet pages do not
                // cross-deliver events between providers.
                if (
                    this.options.target &&
                    event.data.target !== this.options.target
                ) {
                    return
                }
                const { method, params } = event.data.request
                this.notificationHandlers.forEach((h) => h(method, params))
            }
            this.win.addEventListener('message', this.notificationListener)
        }
        return () => {
            this.notificationHandlers.delete(handler)
            // Drop the DOM listener with the last subscriber so an abandoned
            // transport leaves nothing attached to the window; a later
            // subscribe re-installs it.
            if (
                this.notificationHandlers.size === 0 &&
                this.notificationListener
            ) {
                this.win.removeEventListener(
                    'message',
                    this.notificationListener
                )
                this.notificationListener = undefined
            }
        }
    }

    submit = async (payload: RequestPayload) => {
        const message: SpliceMessage = {
            request: jsonRpcRequest(uuidv4(), payload),
            type: WalletEvent.SPLICE_WALLET_REQUEST,
            target: this.options.target,
        }

        this.win.postMessage(message, '*')

        return new Promise<SuccessResponse>((resolve, reject) => {
            const listener = (event: MessageEvent) => {
                if (
                    !isSpliceMessageEvent(event) ||
                    event.data.type !== WalletEvent.SPLICE_WALLET_RESPONSE ||
                    event.data.response.id !== message.request.id
                ) {
                    return
                }

                window.removeEventListener('message', listener)
                if ('error' in event.data.response) {
                    reject(toJsonRpcError(event.data.response.error))
                } else {
                    resolve(event.data.response)
                }
            }

            window.addEventListener('message', listener)
        })
    }

    submitResponse = (id: string | number | null, payload: ResponsePayload) => {
        const message: SpliceMessage = {
            response: jsonRpcResponse(id, payload),
            type: WalletEvent.SPLICE_WALLET_RESPONSE,
        }
        this.win.postMessage(message, '*')
    }
}

export class HttpTransport implements RpcTransport {
    constructor(
        private url: URL,
        private accessToken?: string
    ) {}

    protected async handleErrorResponse(response: Response): Promise<never> {
        const body = await response.text()

        let parsedBody: unknown
        try {
            parsedBody = JSON.parse(body)
        } catch {
            // not JSON, fall back to the HTTP status below
        }
        const rpcError = ErrorResponse.safeParse(parsedBody)
        if (rpcError.success) {
            throw toJsonRpcError(rpcError.data.error)
        }

        const details = {
            message: response.statusText || `HTTP ${response.status}`,
            data: body,
        }
        switch (response.status) {
            case 400:
                throw rpcErrors.invalidRequest(details)
            case 401:
            case 403:
                throw providerErrors.unauthorized(details)
            case 404:
                throw rpcErrors.resourceNotFound(details)
            case 413:
            case 429:
                throw rpcErrors.limitExceeded(details)
            case 408:
            case 502:
            case 503:
            case 504:
                throw rpcErrors.resourceUnavailable(details)
            default:
                throw rpcErrors.internal(details)
        }
    }

    async submit(payload: RequestPayload): Promise<SuccessResponse> {
        const request: JsonRpcRequest = {
            jsonrpc: '2.0',
            method: payload.method,
            params: payload.params,
            id: uuidv4(),
        }

        const header = this.accessToken
            ? { Authorization: `Bearer ${this.accessToken}` }
            : undefined

        const response = await fetch(this.url.href, {
            method: 'POST',
            headers: {
                ...header,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        }).catch((error: unknown) => {
            throw toJsonRpcError(error)
        })

        if (!response.ok) {
            return this.handleErrorResponse(response)
        }

        const json = await response.json()
        const rpcError = ErrorResponse.safeParse(json)
        if (rpcError.success) {
            throw toJsonRpcError(rpcError.data.error)
        }

        return SuccessResponse.parse(json)
    }
}
