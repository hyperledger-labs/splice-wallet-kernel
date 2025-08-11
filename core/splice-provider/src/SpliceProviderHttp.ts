import {
    isSpliceMessageEvent,
    RequestPayload,
    WalletEvent,
    WindowTransport,
} from 'core-types'
import { SpliceProviderBase } from './SpliceProvider'
import { io, Socket } from 'socket.io-client'

export class SpliceProviderHttp extends SpliceProviderBase {
    private sessionToken?: string
    private socket: Socket
    private transport: WindowTransport

    private openSocket(url: URL): Socket {
        // Assumes the RPC URL is on /rpc, and the socket URL is the same but without the /rpc path.
        const socketUrl = new URL(url.href)
        socketUrl.pathname = ''

        if (this.socket) {
            this.socket.disconnect()
        }

        const socket = io(socketUrl.href, {
            forceNew: true,
            auth: {
                token: `Bearer ${this.sessionToken}`,
            },
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

        this.transport = new WindowTransport(window)

        if (sessionToken) this.sessionToken = sessionToken
        this.socket = this.openSocket(url)

        // Listen for the auth success event sent from the WK UI popup to the SDK running in the parent window.
        window.addEventListener('message', async (event) => {
            if (!isSpliceMessageEvent(event)) return

            if (
                event.data.type === WalletEvent.SPLICE_WALLET_IDP_AUTH_SUCCESS
            ) {
                this.sessionToken = event.data.token
                this.openSocket(this.url)

                // we requery the status explicitly here, as it's not guaranteed that the socket will be open & authenticated before the `onConnected` event is fired from the `addSession` RPC call.
                this.request({ method: 'status' }).then((status) => {
                    this.emit('onConnected', status)
                })
            }
        })
    }

    public async request<T>({ method, params }: RequestPayload): Promise<T> {
        console.log('SpliceProviderHTTP request:', method, params)
        const response = await this.transport.submit({ method, params })
        console.log('SpliceProviderHTTP response:', response)
        return response.result as T
    }
}
