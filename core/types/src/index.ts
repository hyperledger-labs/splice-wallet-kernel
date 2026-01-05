// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

/**
 * Logger
 */
export type Logger = Pick<Console, 'debug' | 'info' | 'warn' | 'error'>

export const PartyId = z
    .string()
    .regex(/^[a-zA-Z0-9:_-]*::[a-z0-9]*/, 'Invalid party ID format')

export type PartyId = z.infer<typeof PartyId>

/**
 *  Requests / responses
 */
export const RequestPayload = z.object({
    method: z.string(),
    params: z.optional(
        z.union([z.array(z.unknown()), z.record(z.string(), z.unknown())])
    ),
})
export type RequestPayload = z.infer<typeof RequestPayload>

export const SuccessResponse = z.object({
    result: z.optional(z.unknown()),
})
export type SuccessResponse = z.infer<typeof SuccessResponse>

export const ErrorResponse = z.object({
    error: z.object({
        code: z.number(),
        message: z.string(),
        data: z.optional(
            z
                .string()
                .or(z.number())
                .or(z.boolean())
                .or(z.null())
                .or(z.unknown())
        ),
    }),
})
export type ErrorResponse = z.infer<typeof ErrorResponse>

export const ResponsePayload = z.union([SuccessResponse, ErrorResponse])
export type ResponsePayload = z.infer<typeof ResponsePayload>

/**
 * JSON RPC
 */
export const JsonRpcMeta = z.object({
    jsonrpc: z.literal('2.0'), // only support JSON-RPC 2.0
    id: z.optional(z.string().or(z.number()).or(z.undefined()).or(z.null())),
})
export type JsonRpcMeta = z.infer<typeof JsonRpcMeta>

export const JsonRpcRequest = z.intersection(JsonRpcMeta, RequestPayload)
export type JsonRpcRequest = z.infer<typeof JsonRpcRequest>

export const JsonRpcResponse = z.intersection(JsonRpcMeta, ResponsePayload)
export type JsonRpcResponse = z.infer<typeof JsonRpcResponse>

/**
 * Window / message events
 */
export enum WalletEvent {
    // JSON-RPC related events
    SPLICE_WALLET_REQUEST = 'SPLICE_WALLET_REQUEST',
    SPLICE_WALLET_RESPONSE = 'SPLICE_WALLET_RESPONSE',
    // Browser extension related events
    SPLICE_WALLET_EXT_READY = 'SPLICE_WALLET_EXT_READY', // A request from the dApp to the browser extension to see if its loaded
    SPLICE_WALLET_EXT_ACK = 'SPLICE_WALLET_EXT_ACK', // A response from the extension back to the dapp to acknowledge readiness
    SPLICE_WALLET_EXT_OPEN = 'SPLICE_WALLET_EXT_OPEN', // A request from the dApp to the browser extension to open the wallet UI
    // Auth events
    SPLICE_WALLET_IDP_AUTH_SUCCESS = 'SPLICE_WALLET_IDP_AUTH_SUCCESS',
}

export type SpliceMessageEvent = MessageEvent<SpliceMessage>

export const SpliceMessage = z.discriminatedUnion('type', [
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_REQUEST),
        request: JsonRpcRequest,
    }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_RESPONSE),
        response: JsonRpcResponse,
    }),
    z.object({ type: z.literal(WalletEvent.SPLICE_WALLET_EXT_READY) }),
    z.object({ type: z.literal(WalletEvent.SPLICE_WALLET_EXT_ACK) }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_EXT_OPEN),
        url: z.string().url(),
    }),
    z.object({
        type: z.literal(WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS),
        token: z.string(),
        sessionId: z.string(),
    }),
])
export type SpliceMessage = z.infer<typeof SpliceMessage>

export const isSpliceMessageEvent = (
    event: unknown
): event is SpliceMessageEvent => {
    if (typeof event === 'object' && event !== null && 'data' in event) {
        return isSpliceMessage(event.data)
    } else {
        return false
    }
}

export const isSpliceMessage = (message: unknown): message is SpliceMessage => {
    return SpliceMessage.safeParse(message).success
}

/**
 * SDK types
 */
export const DiscoverResult = z.discriminatedUnion('walletType', [
    z.object({
        walletType: z.literal('extension'),
        url: z.optional(z.never()),
    }),
    z.object({
        walletType: z.literal('remote'),
        url: z.string().url(),
    }),
])

export type DiscoverResult = z.infer<typeof DiscoverResult>

export const GatewaysConfig = z.object({
    name: z.string(),
    rpcUrl: z.string(),
})

export type GatewaysConfig = z.infer<typeof GatewaysConfig>

// TODO(#131) - move this to rpc-transport package

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
    submit: (payload: RequestPayload) => Promise<ResponsePayload>
}

export class WindowTransport implements RpcTransport {
    constructor(private win: Window) {}

    submit = async (payload: RequestPayload) => {
        const message: SpliceMessage = {
            request: jsonRpcRequest(uuidv4(), payload),
            type: WalletEvent.SPLICE_WALLET_REQUEST,
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
                    reject(event.data.response.error)
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

    async submit(payload: RequestPayload): Promise<ResponsePayload> {
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
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        })

        if (!response.ok) {
            const body = await response.text()

            // if the response uses the RPC error format, throw it as is
            if (ErrorResponse.safeParse(JSON.parse(body)).success) {
                throw JSON.parse(body)
            } else {
                throw new Error(
                    `HTTP request failed: ${response.status}, text: ${await response.text()} `
                )
            }
        }

        const json = await response.json()
        return ResponsePayload.parse(json)
    }
}
