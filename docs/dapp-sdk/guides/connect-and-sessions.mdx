---
title: 'Connect & Sessions'
description: 'Initialize the SDK, connect a wallet, restore sessions, and disconnect.'
---

This guide covers the connection lifecycle: initializing the SDK, connecting a wallet,
inspecting connection status, restoring a returning user's session, and disconnecting.

All examples use the high-level SDK. For the equivalent low-level calls, see the
[Provider API](../reference/provider-api.md).

## Connection flow

A dApp connects to a wallet in four steps:

1. **Discover** the SDK finds available wallets and lists them in the wallet picker.
2. **Connect** the user picks a wallet and authenticates.
3. **Session** the wallet establishes an authenticated session that the SDK reuses for later calls.
4. **Transact** your dApp reads parties, signs messages, and submits transactions, which the user approves in their wallet.

## Initialize the SDK

Call `init()` once, early in your app's lifecycle (for example, on mount). It registers
the default wallet adapters and attempts to restore a previous session **without** opening
the wallet picker.

```typescript
import * as sdk from '@canton-network/dapp-sdk'

await sdk.init()
```

> [!NOTE]
> Call `init()` exactly once. To add or replace wallets (WalletConnect, custom remote wallets),
> pass options to `init()`. See [Wallet discovery](wallet-discovery.md).

## Connect a wallet

Call `connect()` in response to a user action. This opens the wallet picker and runs the
authentication flow if the user is not already authenticated.

```typescript
async function onConnectClick() {
    const result = await sdk.connect()
    if (result.isConnected) {
        // Show the connected UI
    }
}
```

Always trigger `connect()` from a user gesture (such as a button click). Calling it
automatically on page load will open the picker unexpectedly. Use `init()` for silent
session restore instead.

If the user is not already authenticated, the wallet prompts them to log in before the
connection completes. Remote wallets do this by returning a `userUrl` for the user to open;
see [Sync and Async APIs](../reference/provider-api.md#sync-and-async-apis).

## Sessions

When the user connects, the wallet establishes an authenticated **session**. The SDK stores
the session and reuses it for every subsequent call, such as listing accounts or executing
transactions, so the user does not re-authenticate each time. `init()` restores an existing
session silently, and `disconnect()` ends it.

## Restore a session on page load

`init()` restores an existing session silently. After it resolves, check whether the user
is already connected before showing a "Connect" button.

```typescript
await sdk.init()

const { isConnected } = await sdk.isConnected()
if (isConnected) {
    // Returning user: render the connected UI
} else {
    // Show the "Connect wallet" button
}
```

`isConnected()` does **not** trigger the login flow, so it is safe to call on load.

## Check connection status

`status()` returns network- and session-related details for the current connection.

```typescript
const result = await sdk.status()
const label = result.connection.isConnected ? 'connected' : 'disconnected'
```

Use `status()` when you need richer detail than the boolean from `isConnected()`.

## React to status changes

Subscribe to `onStatusChanged` to keep your UI in sync when the session changes (for
example, the wallet disconnects or the session expires). Remove the listener when your
component unmounts.

```typescript
function subscribe() {
    const handler = (status) => {
        setConnected(status.connection.isConnected)
    }

    sdk.onStatusChanged(handler)

    // Call on unmount to avoid leaks:
    return () => sdk.offStatusChanged(handler)
}
```

## Disconnect

End the session between your app and the wallet.

```typescript
async function onDisconnectClick() {
    await sdk.disconnect()
}
```

## Next steps

- [Parties & Transactions](parties-and-transactions.md) — Read parties, sign messages, execute transactions, and query the ledger.
- [Wallet Discovery](wallet-discovery.md) — Customize the wallet picker and add WalletConnect or custom remote wallets.
