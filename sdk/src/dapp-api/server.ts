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

export class DappServer {
    controller: Methods

    constructor() {
        this.controller = dappController()
    }

    static sendResponse(response: SpliceMessage) {
        console.log('Sending response:', response)
        window.postMessage(response, '*')
    }

    // Main RPC handler for incoming JSON-RPC requests
    async handleRpcRequest(message: unknown): Promise<JsonRpcResponse> {
        return new Promise((resolve, reject) => {
            if (
                isSpliceMessage(message) &&
                message.type === WalletEvent.SPLICE_WALLET_REQUEST
            ) {
                console.log('Processing JSON-RPC request:', message.request)
                const { request } = message

                const id = request.id || null
                const method = request.method as keyof Methods

                const methodFn = this.controller[method]

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
                    this.handleRpcRequest(message)
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
