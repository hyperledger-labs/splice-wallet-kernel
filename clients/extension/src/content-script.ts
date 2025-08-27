import {
    SpliceMessage,
    SpliceMessageEvent,
    WalletEvent,
} from '@hyperledger-labs/core-types'
import Browser from 'webextension-polyfill'

// Handle incoming RPC requests from the dapp,
// proxy them to the extension background script,
// and send the response back to the dapp
window.addEventListener('message', async (event: SpliceMessageEvent) => {
    console.log('Content script received message:', event.data)

    const { data: msg, success } = SpliceMessage.safeParse(event.data)

    if (!success) {
        // not a valid SpliceMessage, ignore
        return
    }

    // Forward JSON RPC requests to the background script
    if (msg.type === WalletEvent.SPLICE_WALLET_REQUEST) {
        console.log('Received request:', msg)

        // Proxy the message to the extension background script
        // and wait for the response
        const msgResponse = await Browser.runtime.sendMessage(msg)

        console.log('Received response from background:', msgResponse)
        const response = SpliceMessage.parse(msgResponse)

        window.postMessage(response, '*')
    }

    // Forward UI open requests to the background script
    if (msg.type === WalletEvent.SPLICE_WALLET_EXT_OPEN) {
        await Browser.runtime.sendMessage(msg)
    }

    // Acknowledge the extension readiness request
    if (msg.type === WalletEvent.SPLICE_WALLET_EXT_READY) {
        window.postMessage({ type: WalletEvent.SPLICE_WALLET_EXT_ACK }, '*')
    }
})
