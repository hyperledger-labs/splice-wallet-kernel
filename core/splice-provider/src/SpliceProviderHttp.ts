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
import { popupHref } from '@canton-network/core-wallet-ui-components'

export class SpliceProviderHttp extends SpliceProviderBase {
    private sessionToken?: string
    private socket: Socket
    private transport: HttpTransport

    private openSocket(url: URL): Socket {
        // Assumes the RPC URL is on /rpc, and the socket URL is the same but without the /rpc path.
        const socketUrl = new URL(url.href)
        socketUrl.pathname = ''

        if (this.socket) {
            console.debug('SpliceProviderHttp: closing existing socket')
            this.socket.disconnect()
        }

        const socket = io(socketUrl.href, {
            forceNew: true,
            auth: this.sessionToken
                ? {
                      token: `Bearer ${this.sessionToken}`,
                  }
                : {},
        })

        socket.onAny((event, ...args) => {
            this.emit(event, ...args)
        })

        return socket
    }

    constructor(
        private url: URL,
        sessionToken?: string
    ) {
        super()

        if (sessionToken) this.sessionToken = sessionToken
        this.transport = new HttpTransport(url, sessionToken)

        this.socket = this.openSocket(url)

        // Prevent serialization of the socket
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(this.socket as any).toJSON = () => ({})

        // Listen for the auth success event sent from the WK UI popup to the SDK running in the parent window.
        window.addEventListener('message', async (event) => {
            if (!isSpliceMessageEvent(event)) return

            if (
                event.data.type === WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS
            ) {
                this.sessionToken = event.data.token
                this.transport = new HttpTransport(url, this.sessionToken)
                console.log(
                    `SpliceProviderHttp: setting sessionToken to ${this.sessionToken}`
                )
                this.openSocket(this.url)

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

        const result = response.result as T
        if (method === 'prepareExecute') {
            const { userUrl } = result as { userUrl?: string }
            if (!userUrl) {
                throw new Error('No userUrl provided in response')
            }
            popupHref(userUrl)
        }
        return result
    }
}
