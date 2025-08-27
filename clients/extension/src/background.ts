import Browser from 'webextension-polyfill'
import { dappController } from './dapp-api/controller'
import { Methods } from './dapp-api/rpc-gen'
import {
    isSpliceMessage,
    ResponsePayload,
    SpliceMessage,
    WalletEvent,
} from '@hyperledger-labs/core-types'
import { rpcErrors } from '@metamask/rpc-errors'

const controller = dappController()

function jsonRpcResponse(
    id: string | number | null,
    payload: ResponsePayload
): SpliceMessage {
    return {
        response: {
            jsonrpc: '2.0',
            id, // id should be set based on the request context
            ...payload,
        },
        type: WalletEvent.SPLICE_WALLET_RESPONSE,
    }
}

// Main RPC handler for incoming JSON-RPC requests
async function handleRpcRequest(message: unknown): Promise<SpliceMessage> {
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

// Listen for messages from the dapp
// and handle them as JSON-RPC requests
Browser.runtime.onMessage.addListener((message, _, sendResponse) => {
    console.log('Received message in background script:', message)

    if (isSpliceMessage(message)) {
        if (message.type === WalletEvent.SPLICE_WALLET_REQUEST) {
            handleRpcRequest(message)
                .then(sendResponse)
                .catch((error: unknown) => {
                    if (isSpliceMessage(error) && 'error' in error) {
                        sendResponse(error)
                    } else {
                        console.error('No response generated for the request')
                        sendResponse(
                            jsonRpcResponse(null, {
                                error: rpcErrors.internal({
                                    message: 'Internal error',
                                    data: 'No response generated for the request',
                                }),
                            })
                        )
                    }
                })
        } else if (message.type === WalletEvent.SPLICE_WALLET_EXT_OPEN) {
            // Handle the request to open the wallet UI
            Browser.windows.create({
                url: message.url,
                type: 'popup',
                width: 400,
                height: 600,
            })
            sendResponse(null)
        } else {
            sendResponse(null)
        }
    } else {
        sendResponse(null)
    }

    return true // Indicates that the response will be sent asynchronously
})
