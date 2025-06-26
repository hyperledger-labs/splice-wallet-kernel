import Browser from 'webextension-polyfill'

window.onmessage = async (event: MessageEvent) => {
    if (event.data.type === 'SPLICE_WALLET_REQUEST') {
        console.log('Received request:', event.data)
        // Handle the request here, e.g., by calling a method on SpliceProvider
        // For now, just echoing back a response
        const response = await Browser.runtime.sendMessage({
            type: 'SPLICE_WALLET_REQUEST',
            method: event.data.method,
            params: event.data.params,
        })

        window.postMessage(
            {
                type: 'SPLICE_WALLET_RESPONSE',
                result: response,
            },
            '*'
        )
    }
}
