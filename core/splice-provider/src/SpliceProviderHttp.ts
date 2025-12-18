// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    HttpTransport,
    isSpliceMessageEvent,
    RequestPayload,
    WalletEvent,
} from '@canton-network/core-types'
import { SpliceProviderBase } from './SpliceProvider'
import { io, Socket } from 'socket.io-client'

// Maintain a global socket instance in-memory to avoid multiple connections
// per SpliceProviderHttp instance.
type GatewaySocket = {
    socket: Socket
    url: string
    token: string
} | null

let connection: GatewaySocket = null

export class SpliceProviderHttp extends SpliceProviderBase {
    private sessionToken?: string
    private transport: HttpTransport

    private openSocket(url: URL, token: string): void {
        // Assumes the socket URI is accessed directly on the host w/o the API path.
        const socketUri = url.origin

        // Reconnect if the URL or token has changed
        if (
            connection &&
            (token !== connection.token || socketUri !== connection.url)
        ) {
            connection.socket.disconnect()
            connection = null
        }

        if (!connection) {
            connection = {
                token,
                url: socketUri,
                socket: io(socketUri, {
                    auth: {
                        token: `Bearer ${token}`,
                    },
                }),
            }

            connection.socket.onAny((event, ...args) => {
                this.emit(event, ...args)
            })
        }
    }

    constructor(
        private url: URL,
        sessionToken?: string
    ) {
        super()

        if (sessionToken) {
            this.sessionToken = sessionToken
            this.openSocket(url, sessionToken)
        }

        this.transport = new HttpTransport(url, sessionToken)

        // Listen for the auth success event sent from the WK UI popup to the SDK running in the parent window.
        window.addEventListener('message', async (event) => {
            if (!isSpliceMessageEvent(event)) return

            if (
                event.data.type === WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS
            ) {
                this.sessionToken = event.data.token
                this.transport = new HttpTransport(url, this.sessionToken)
                this.openSocket(this.url, event.data.token)

                // We requery the status explicitly here, as it's not guaranteed that the socket will be open & authenticated
                // before the `onConnected` event is fired from the `addSession` RPC call. The dappApi.StatusResult and
                // dappApi.OnConnectedEvent are mapped manually to avoid dependency.
                this.request({ method: 'status' })
                    .then((status) => {
                        this.emit('onConnected', status)
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
        const response = await this.transport.submit({ method, params })

        if ('error' in response) throw new Error(response.error.message)

        return response.result as T
    }
}
