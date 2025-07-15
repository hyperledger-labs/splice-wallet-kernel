import {
    isSpliceMessageEvent,
    JsonRpcResponse,
    RequestPayload,
    WalletEvent,
} from 'core-types'
import { EventListener, SpliceProviderBase } from './SpliceProvider'
import { io, Socket } from 'socket.io-client'
import { popupHref } from 'core-wallet-ui-components'

export class SpliceProviderHttp extends SpliceProviderBase {
    private sessionToken?: string
    private socket: Socket

    private openSocket(url: URL): Socket {
        // Assumes the RPC URL is on /rpc, and the socket URL is the same but without the /rpc path.
        const socketUrl = new URL(url.href)
        socketUrl.pathname = ''

        if (this.socket) {
            this.socket.disconnect()
        }

        return io(socketUrl.href, {
            forceNew: true,
            auth: {
                token: `Bearer ${this.sessionToken}`,
            },
        })
    }

    constructor(
        private url: URL,
        sessionToken?: string
    ) {
        super()

        if (sessionToken) this.sessionToken = sessionToken
        this.socket = this.openSocket(url)

        // Listen for the auth success event sent from the WK UI popup to the SDK running in the parent window.
        window.addEventListener('message', async (event) => {
            if (!isSpliceMessageEvent(event)) return

            if (
                event.data.type === WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS
            ) {
                this.sessionToken = event.data.token
                console.log(
                    `SpliceProviderHttp: setting sessionToken to ${this.sessionToken}`
                )
                this.socket.auth = {
                    token: `Bearer ${this.sessionToken}`,
                }
            }
        })
    }

    public async request<T>({ method, params }: RequestPayload): Promise<T> {
        return await this.jsonRpcRequest(this.url, method, params)
    }

    async jsonRpcRequest<T>(
        url: URL,
        method: string,
        params: unknown
    ): Promise<T> {
        const res = await fetch(url.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.sessionToken && {
                    Authorization: `Bearer ${this.sessionToken}`,
                }),
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params,
            }),
        })

        const body = await res.json().then(JsonRpcResponse.parse)

        if ('error' in body) throw new Error(body.error.message)

        if (method === 'prepareExecute') {
            const { userUrl } = body.result as { userUrl?: string }
            if (!userUrl) {
                throw new Error('No userUrl provided in response')
            }
            popupHref(userUrl)
        }

        return body.result as T
    }

    // Re-alias the event methods directly to the socket instance
    override on<T>(
        event: string,
        listener: EventListener<T>
    ): SpliceProviderHttp {
        this.socket.on(event, listener)
        return this
    }

    override emit<T>(event: string, ...args: T[]): boolean {
        this.socket.emit(event, ...args)
        return true
    }

    override removeListener<T>(
        event: string,
        listenerToRemove: EventListener<T>
    ): SpliceProviderHttp {
        this.socket.removeListener(event, listenerToRemove)
        return this
    }
}
