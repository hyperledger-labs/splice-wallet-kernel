import {
    RequestPayload,
    SpliceMessage,
    SpliceMessageEvent,
    WalletEvent,
} from 'core-types'
import { SpliceProviderBase } from './SpliceProvider.js'

export class SpliceProviderWindow extends SpliceProviderBase {
    public async request<T>({ method, params }: RequestPayload): Promise<T> {
        return await this.jsonRpcRequest(method, params)
    }

    async jsonRpcRequest<T>(
        method: string,
        params?: RequestPayload['params']
    ): Promise<T> {
        const message: SpliceMessage = {
            type: WalletEvent.SPLICE_WALLET_REQUEST,
            request: {
                jsonrpc: '2.0',
                id: Date.now(),
                method,
                params,
            },
        }

        return new Promise((resolve, reject) => {
            window.postMessage(message, '*')

            const listener = (event: SpliceMessageEvent) => {
                if (
                    event.source !== window ||
                    event.data.type !== WalletEvent.SPLICE_WALLET_RESPONSE
                )
                    return

                window.removeEventListener('message', listener)

                if ('error' in event.data.response) {
                    reject(event.data.response.error)
                } else {
                    resolve(event.data.response.result as T)
                }
            }

            window.addEventListener('message', listener)
        })
    }
}
