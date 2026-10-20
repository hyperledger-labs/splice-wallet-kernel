---
title: 'Remote Wallet'
description: 'Expose a remote (server-side) wallet to Canton dApps via a CIP-103 RPC endpoint.'
---

Remote wallets are server-side wallets. They are not injected into the page; instead they
expose a CIP-103 RPC endpoint over HTTP/SSE, and dApps register that endpoint with a
`RemoteAdapter`. Remote wallets implement the asynchronous
[dApp API](../reference/provider-api.md#sync-and-async-apis), where
actions that need user interaction are completed through a `userUrl` redirect.

## Expose a CIP-103 endpoint

Your service must expose a public RPC URL that implements the CIP-103 request methods and
event stream. The SDK ships with a default list of remote wallets; additional ones are
added by dApps at runtime.

## Getting dApps to list your wallet

DApps add your endpoint to their wallet picker with a `RemoteAdapter` pointed at your public
RPC URL. Share that URL and a display name with integrating dApps. The dApp-side
registration steps are covered in
[Wallet discovery](../guides/wallet-discovery.md).

## Establishing a dapp-sdk session

In order to establish a unique session with a dApp by its origin using the `@canton-network/dapp-sdk`, then your Remote Wallet (assuming it has an open browser communication channel with the dApp) must listen for `SPLICE_WALLET_BROADCAST_ORIGIN` message events.

This enables secure future communications over `window.postMessage` (by explicitly setting `origin` to the dApp, preventing other JS scripts from intercepting messages) and also enables the Remote Wallet to manage user sessions keyed by dApp origins.

An example of this is provided below, courtesy of the Wallet Gateway Remote implementation:

```ts
import { isSpliceMessageEvent, WalletEvent } from '@canton-network/core-types'

const handleMessage = (event: MessageEvent) => {
    if (!isSpliceMessageEvent(event)) return
    if (window.opener && event.source !== window.opener) return
    if (event.data.type !== WalletEvent.SPLICE_WALLET_BROADCAST_ORIGIN) return
    if (event.data.origin !== event.origin) return

    stateManager.currentOrigin.set(event.data.origin)
    window.opener.postMessage(
        {
            type: WalletEvent.SPLICE_WALLET_BROADCAST_ORIGIN_ACK,
        },
        event.origin
    )
    window.removeEventListener('message', handleMessage)
}

window.addEventListener('message', handleMessage)

export async function detectCurrentOrigin(): Promise<string> {
    if (!window.opener) {
        stateManager.currentOrigin.set(window.origin)
        return window.origin
    }

    return new Promise((resolve) => {
        // wait for stateManager.currentOrigin.get to be defined
        const interval = setInterval(() => {
            const currentOrigin = stateManager.currentOrigin.get()
            if (currentOrigin) {
                clearInterval(interval)
                resolve(currentOrigin)
            }
        }, 100)
    })
}
```

More details about this flow may be found in the repo wiki: https://github.com/canton-network/wallet/wiki/Wallet-Gateway#window-communication

DISCLAIMER: The entire window message protocol (including `SPLICE_WALLET_BROADCAST_ORIGIN_ACK` messages) that is currently used between the dapp-sdk and a Wallet is a W.I.P. and subject to change. A cleaner API & type-safe companion library may be delivered in the future to better facilitate this.

## Requirements

- Serve the CIP-103 RPC methods and event stream at a stable, public URL.
- Configure CORS to allow the origins of the dApps that will connect.
- Manage user sessions and issue the session token (JWT) the endpoint expects.
- Handle authorization and signing on your side; never expose keys to the dApp.

## Next steps

- [CIP-103 Specification](https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md) — The methods and events your endpoint must implement.
