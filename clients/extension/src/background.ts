import Browser from 'webextension-polyfill'
import { dappController } from './dapp-api/controller'
import { Methods } from './dapp-api/rpc-gen'

console.log('background worker script')

const controller = dappController()

Browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message in background script:', message)

    // TODO: Parse the message with Zod to ensure it has the correct structure
    const { method, params } = message as {
        method?: keyof Methods
        params?: unknown
    }

    if (method) {
        // TODO: get better types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        controller[method](params as any)
            .then((response) =>
                sendResponse({
                    type: 'SPLICE_WALLET_RESPONSE',
                    result: response,
                })
            )
            .catch((error) =>
                sendResponse({
                    type: 'SPLICE_WALLET_RESPONSE',
                    error:
                        error instanceof Error ? error.message : String(error),
                })
            )
    } else {
        sendResponse({
            type: 'SPLICE_WALLET_RESPONSE',
            result: `ERROR`,
        })
    }

    return true // Indicates that the response will be sent asynchronously
})
