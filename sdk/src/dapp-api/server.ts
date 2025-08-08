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
import { HttpClient } from '../http-client'

export class DappServer {
    private controller: Promise<Methods>
    private httpClient: HttpClient
    private listener = async (event: SpliceMessageEvent) => {
        const { data: message, success } = SpliceMessage.safeParse(event.data)

        if (!success) {
            // not a valid SpliceMessage, ignore
            return
        }

        const transport = new WindowTransport(window)

        // Forward JSON RPC requests to the background script
        if (message.type === WalletEvent.SPLICE_WALLET_REQUEST) {
            this.handleRpcRequest(message)
                .then((response) => {
                    console.log(
                        'Sending response for request',
                        message.request.id,
                        response
                    )
                    transport.submitResponse(
                        message.request.id || null,
                        response
                    )
                })
                .catch((error: unknown) => {
                    const e = JsonRpcResponse.safeParse(error)
                    if (e.success) {
                        transport.submitResponse(
                            message.request.id || null,
                            e.data
                        )
                    } else {
                        console.error(
                            'No response generated for the request',
                            error
                        )
                        transport.submitResponse(message.request.id || null, {
                            error: rpcErrors.internal({
                                message: 'Internal error',
                                data: 'No response generated for the request',
                            }),
                        })
                    }
                })
        }
    }

    constructor(private rpcUrl: URL) {
        this.httpClient = new HttpClient(rpcUrl)
        this.controller = this.getController()
        window.addEventListener('message', this.listener)
    }

    // Main RPC handler for incoming JSON-RPC requests
    async handleRpcRequest(message: unknown): Promise<JsonRpcResponse> {
        const controller = await this.controller
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
                    .then((result) => {
                        resolve(jsonRpcResponse(id, { result }))
                    })
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

    async getController(): Promise<Methods> {
        const kernelInfo = await this.httpClient.request<userApi.InfoResult>({
            method: 'info',
            params: [],
        })
        if (!kernelInfo.kernel.uiUrl) {
            throw new Error('Kernel info does not contain uiUrl')
        }
        const controller = dappController(
            this.rpcUrl,
            new URL(kernelInfo.kernel.uiUrl)
        )
        return controller
    }

    stop() {
        window.removeEventListener('message', this.listener)
        console.log('DappServer stopped listening for messages')
    }
}
