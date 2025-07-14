import { isSpliceMessageEvent, RequestPayload, WalletEvent } from 'core-types'
import { SpliceProviderBase } from './SpliceProvider'
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

    constructor(private url: URL) {
        super()

        this.socket = this.openSocket(url)

        // Listen for the auth success event sent from the WK UI popup to the SDK running in the parent window.
        window.addEventListener('message', (event) => {
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

                const status = this.request({ method: 'status' })
                console.log(status)
            }
        })

        this.on('onConnected', (args) => {
            if (
                args &&
                args instanceof Object &&
                'sessionToken' in args &&
                typeof args.sessionToken === 'string'
            ) {
                console.log('onconnected event')
                console.log(
                    `SpliceProviderHttp: setting sessionToken to ${args.sessionToken}`
                )
                this.sessionToken = args.sessionToken
            } else {
                console.log(
                    `SpliceProviderHttp: onConnected event did not contain a valid sessionToken`
                )
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

        const body = await res.json()

        if (method === 'prepareExecute') {
            const userUrl = body.result?.userUrl
            popupHref(userUrl)
        }

        if (body.error) throw new Error(body.error.message)
        return body.result
    }

    // Re-alias the event methods directly to the socket instance
    override on(event: string, listener: EventListener): SpliceProviderHttp {
        this.socket.on(event, listener)
        return this
    }

    override emit(event: string, ...args: unknown[]): boolean {
        this.socket.emit(event, ...args)
        return true
    }

    override removeListener(
        event: string,
        listenerToRemove: EventListener
    ): SpliceProviderHttp {
        this.socket.removeListener(event, listenerToRemove)
        return this
    }
}
