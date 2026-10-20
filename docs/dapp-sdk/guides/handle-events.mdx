---
title: 'Handle Events'
description: 'Subscribe to connection, account, and transaction events, and clean up listeners.'
---

The dApp SDK emits events so your UI can stay in sync with the wallet's state. Subscribe
with the `on*` functions and always unsubscribe with the matching `off*` function when your
component unmounts.

For the full list of events and their payloads, see the
[Events reference](../reference/events.md).

## React to connection status changes

`onStatusChanged` fires when the connection status or session state changes.

```typescript
const handler = (status) => {
    console.log('Connected:', status.connection.isConnected)
}

sdk.onStatusChanged(handler)
// Later:
sdk.offStatusChanged(handler)
```

## React to account changes

`onAccountsChanged` fires when accounts are added or removed, or the primary account
changes. Re-read the primary party rather than caching it.

```typescript
sdk.onAccountsChanged((accounts) => {
    const primary = accounts.find((a) => a.primary)
})
```

## Track transactions

`onTxChanged` fires as a transaction submitted via `prepareExecute` moves through its
lifecycle (`pending`, `signed`, `executed`, `failed`).

```typescript
sdk.onTxChanged((tx) => {
    if (tx.status === 'executed') {
        console.log('Update ID:', tx.payload.updateId)
    }
})
```

## Clean up listeners

Remove every listener when the component unmounts. Leaked listeners cause memory leaks and
stale UI updates.

```typescript
const handler = (status) => setConnected(status.connection.isConnected)

sdk.onStatusChanged(handler)

// On unmount:
sdk.offStatusChanged(handler)
```

## Next steps

- [Events](../reference/events.md) — The full event list and payload shapes.
- [Parties & Transactions](parties-and-transactions.md) — Read parties and submit transactions.
