class SpliceProvider {
    constructor() {
        this.request = this.request.bind(this)
        this.listeners = {} // Event listeners
    }

    // interface RequestArguments {
    //   readonly method: string;
    //   readonly params?: readonly unknown[] | object;
    // }

    async request({ method, params }) {
        return new Promise((resolve, reject) => {
            window.postMessage(
                { type: 'SPLICE_WALLET_REQUEST', method, params },
                '*'
            )

            const listener = (event) => {
                if (
                    event.source !== window ||
                    event.data.type !== 'SPLICE_WALLET_RESPONSE'
                )
                    return
                console.log('web3 received response:', event)
                window.removeEventListener('message', listener)
                event.data.error
                    ? reject(event.data.error)
                    : resolve(event.data.result)
            }

            window.addEventListener('message', listener)
        })
    }

    // Event handling
    on(event, listener) {
        if (!this.listeners[event]) {
            this.listeners[event] = []
        }
        this.listeners[event].push(listener)
    }

    emit(event, ...args) {
        if (this.listeners[event]) {
            this.listeners[event].forEach((listener) => listener(...args))
        }
    }

    removeListener(event, listenerToRemove) {
        if (!this.listeners[event]) return
        this.listeners[event] = this.listeners[event].filter(
            (listener) => listener !== listenerToRemove
        )
    }
}

// Inject the provider into the dApp
window.splice = new SpliceProvider()
window.canton = window.splice
// Alias it for dApp compatibility (EIP-1193)
window.ethereum = window.splice
