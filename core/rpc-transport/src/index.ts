// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from 'uuid'
import {
    RequestPayload,
    ResponsePayload,
    JsonRpcRequest,
    SpliceMessage,
    WalletEvent,
    isSpliceMessageEvent,
    SuccessResponse,
    ErrorResponse,
    JsonRpcResponse,
} from '@canton-network/core-types'

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

    protected async handleErrorResponse(response: Response): Promise<never> {
        const body = await response.text()

        try {
            // if the response uses the RPC error format, throw it as is
            if (ErrorResponse.safeParse(JSON.parse(body)).success) {
                throw JSON.parse(body)
            } else {
                throw new Error(
                    `HTTP request failed: ${response.status}, text: ${body} `
                )
            }
        } catch (e) {
            console.error(e)
            throw {
                error: {
                    code: response.status,
                    message: response.statusText,
                    data: body,
                },
            }
        }
    }

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
            return this.handleErrorResponse(response)
        }

        const json = await response.json()
        const parsed = ResponsePayload.parse(json)

        if ('error' in parsed) {
            throw parsed
        }

        return parsed
    }
}
