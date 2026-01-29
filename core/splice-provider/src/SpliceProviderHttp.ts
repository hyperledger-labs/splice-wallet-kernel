// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    isSpliceMessageEvent,
    RequestPayload,
    WalletEvent,
} from '@canton-network/core-types'
import { HttpTransport } from '@canton-network/core-rpc-transport'
import SpliceWalletJSONRPCDAppAPI from '@canton-network/core-wallet-dapp-rpc-client'
import { SpliceProviderBase } from './SpliceProvider'

// Maintain a global SSE connection in-memory to avoid multiple connections
// per SpliceProviderHttp instance.
type GatewaySSE = {
    url: string
    token: string
    eventSource: EventSource
} | null

let connection: GatewaySSE = null

function parseSSEData(data: string): unknown[] {
    try {
        const parsed = JSON.parse(data)
        return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
        return [data]
    }
}

export class SpliceProviderHttp extends SpliceProviderBase {
    private sessionToken?: string
    private client: SpliceWalletJSONRPCDAppAPI

    private createClient(sessionToken?: string): SpliceWalletJSONRPCDAppAPI {
        const transport = new HttpTransport(this.url, sessionToken)
        return new SpliceWalletJSONRPCDAppAPI(transport)
    }

    private openSSE(url: URL, token: string): void {
        const sseUrl = new URL('events', url.toString().replace(/\/?$/, '/'))
        sseUrl.searchParams.set('token', token)
        const sseUrlString = sseUrl.toString()

        // Reconnect if the URL or token has changed
        if (
            connection &&
            (token !== connection.token || sseUrlString !== connection.url)
        ) {
            connection.eventSource.close()
            connection = null
        }

        if (!connection) {
            const eventSource = new EventSource(sseUrlString)

            eventSource.onmessage = (event) =>
                this.emit('message', ...parseSSEData(event.data))

            const emitEvent = (name: string) => (event: MessageEvent) =>
                this.emit(name, ...parseSSEData(event.data))

            eventSource.addEventListener(
                'accountsChanged',
                emitEvent('accountsChanged')
            )
            eventSource.addEventListener(
                'statusChanged',
                emitEvent('statusChanged')
            )
            eventSource.addEventListener('connected', emitEvent('connected'))
            eventSource.addEventListener('txChanged', emitEvent('txChanged'))

            eventSource.onerror = () => {
                if (connection?.url === sseUrlString) {
                    connection.eventSource.close()
                    connection = null
                }
            }

            connection = {
                eventSource,
                url: sseUrlString,
                token,
            }
        }
    }

    constructor(
        private url: URL,
        sessionToken?: string
    ) {
        super()

        if (sessionToken) {
            this.sessionToken = sessionToken
            this.openSSE(url, sessionToken)
        }

        this.client = this.createClient(sessionToken)

        // Listen for the auth success event sent from the WK UI popup to the SDK running in the parent window.
        window.addEventListener('message', async (event) => {
            if (!isSpliceMessageEvent(event)) return

            if (
                event.data.type === WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS
            ) {
                this.sessionToken = event.data.token
                this.client = this.createClient(this.sessionToken)
                this.openSSE(this.url, event.data.token)

                // We requery the status explicitly here, as it's not guaranteed that the SSE connection will be open & authenticated
                // before the `connected` event is fired from the `addSession` RPC call. The dappApi.StatusResult and
                // dappApi.ConnectedEvent are mapped manually to avoid dependency.
                this.request({ method: 'status' })
                    .then((status) => {
                        this.emit('connected', status)
                    })
                    .catch((err) => {
                        console.error(
                            'Error requesting status after auth:',
                            err
                        )
                    })
            }
        })
    }

    public async request<T>({ method, params }: RequestPayload): Promise<T> {
        return (await (
            this.client.request as (
                method: string,
                params?: RequestPayload['params']
            ) => Promise<unknown>
        )(method, params)) as T
    }
}
