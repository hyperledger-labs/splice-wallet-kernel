import {
    SpliceProviderBase,
    EventTypes,
    RequestArguments,
} from './SpliceProvider.js'

export class SpliceProviderWindow extends SpliceProviderBase {
    public async request<T>({ method, params }: RequestArguments): Promise<T> {
        return new Promise((resolve, reject) => {
            window.postMessage(
                { type: EventTypes.SPLICE_WALLET_REQUEST, method, params },
                '*'
            )

            const listener = (event: MessageEvent) => {
                if (
                    event.source !== window ||
                    event.data.type !== EventTypes.SPLICE_WALLET_RESPONSE
                )
                    return

                window.removeEventListener('message', listener)

                if (event.data.error) {
                    reject(event.data.error)
                } else {
                    resolve(event.data.result)
                }
            }

            window.addEventListener('message', listener)
        })
    }
}
