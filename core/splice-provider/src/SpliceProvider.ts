type EventListener = (...args: unknown[]) => void

interface RequestArguments {
    readonly method: string
    readonly params?: readonly unknown[] | object
}

enum EventTypes {
    SPLICE_WALLET_REQUEST = 'SPLICE_WALLET_REQUEST',
    SPLICE_WALLET_RESPONSE = 'SPLICE_WALLET_RESPONSE',
}

export class SpliceProvider {
    listeners: { [event: string]: EventListener[] }

    constructor() {
        this.listeners = {} // Event listeners
    }

    public async request({
        method,
        params,
    }: RequestArguments): Promise<unknown> {
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

    // Event handling
    public on(event: string, listener: EventListener): SpliceProvider {
        if (!this.listeners[event]) {
            this.listeners[event] = []
        }
        this.listeners[event].push(listener)

        return this
    }

    public emit(event: string, ...args: unknown[]): boolean {
        if (this.listeners[event]) {
            this.listeners[event].forEach((listener) => listener(...args))
            return true
        }
        return false
    }

    public removeListener(
        event: string,
        listenerToRemove: EventListener
    ): SpliceProvider {
        if (!this.listeners[event]) return this

        this.listeners[event] = this.listeners[event].filter(
            (listener) => listener !== listenerToRemove
        )

        return this
    }
}
