import { SpliceMessage, SpliceMessageEvent, WalletEvent } from 'core-types'
import Browser from 'webextension-polyfill'

// Handle incoming RPC requests from the dapp,
// proxy them to the extension background script,
// and send the response back to the dapp
window.onmessage = async (event: SpliceMessageEvent) => {
    if (event.data.type === WalletEvent.SPLICE_WALLET_REQUEST) {
        console.log('Received request:', event.data)

        // Proxy the message to the extension background script
        // and wait for the response
        const msgResponse = await Browser.runtime.sendMessage(event.data)

        console.log('Received response from background:', msgResponse)
        const response = SpliceMessage.parse(msgResponse)

        window.postMessage(response, '*')
    }
}
