import {
    isSpliceMessage,
    SpliceMessage,
    SpliceMessageEvent,
    WalletEvent,
    jsonRpcResponse,
    JsonRpcResponse,
    WindowTransport,
} from 'core-types'
import { Methods } from './rpc-gen'
import { dappController } from './controller'
import { rpcErrors } from '@metamask/rpc-errors'
import * as userApi from 'core-wallet-user-rpc-client'

export class DappServer {
    private controller: Promise<Methods>

    constructor(private rpcUrl: URL) {
        this.controller = this.getController()
    }

    // Main RPC handler for incoming JSON-RPC requests
    async handleRpcRequest(
        controller: Methods,
        message: unknown
    ): Promise<JsonRpcResponse> {
        return new Promise((resolve, reject) => {
            if (
                isSpliceMessage(message) &&
                message.type === WalletEvent.SPLICE_WALLET_REQUEST
            ) {
                console.log('Processing JSON-RPC request:', message.request)
                const { request } = message

                const id = request.id || null
                const method = request.method as keyof Methods

                const methodFn = controller[method]

                if (!methodFn) {
                    resolve(
                        jsonRpcResponse(id, {
                            error: rpcErrors.methodNotFound({
                                message: `Method ${method} not found`,
                            }),
                        })
                    )
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                methodFn(request.params as any)
                    .then((result) => resolve(jsonRpcResponse(id, { result })))
                    .catch((error) =>
                        reject(
                            jsonRpcResponse(id, {
                                error: rpcErrors.internal({
                                    message:
                                        error instanceof Error
                                            ? error.message
                                            : String(error),
                                }),
                            })
                        )
                    )
            } else {
                reject()
            }
        })
    }

    async getKernelInfo(): Promise<userApi.InfoResult> {
        console.log('Fetching Kernel info...')
        const res = await fetch(this.rpcUrl.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'info',
            }),
        })

        const body = await res.json().then(JsonRpcResponse.parse)
        if ('error' in body) throw new Error(body.error.message)
        return body.result as userApi.InfoResult
    }

    async getController(): Promise<Methods> {
        const kernelInfo = await this.getKernelInfo()
        if (!kernelInfo.kernel.uiUrl) {
            throw new Error('Kernel info does not contain uiUrl')
        }
        const controller = dappController(
            this.rpcUrl,
            new URL(kernelInfo.kernel.uiUrl)
        )
        return controller
    }

    // Handle incoming RPC requests from the dapp,
    // proxy them to the controller, and send the response back to the dapp
    run() {
        console.log('DappServer is running and listening for messages')
        window.addEventListener(
            'message',
            async (event: SpliceMessageEvent) => {
                const { data: message, success } = SpliceMessage.safeParse(
                    event.data
                )

                if (!success) {
                    // not a valid SpliceMessage, ignore
                    return
                }

                const transport = new WindowTransport(window)

                // Forward JSON RPC requests to the background script
                if (message.type === WalletEvent.SPLICE_WALLET_REQUEST) {
                    console.log('Received request:', message)
                    this.handleRpcRequest(await this.controller, message)
                        .then(transport.submitResponse)
                        .catch((error: unknown) => {
                            const e = JsonRpcResponse.safeParse(error)
                            if (e.success) {
                                transport.submitResponse(e.data)
                            } else {
                                console.error(
                                    'No response generated for the request',
                                    error
                                )
                                transport.submitResponse({
                                    error: rpcErrors.internal({
                                        message: 'Internal error',
                                        data: 'No response generated for the request',
                                    }),
                                })
                            }
                        })
                }
            }
        )
    }

    stop() {
        window.removeEventListener('message', this.run)
    }
}
