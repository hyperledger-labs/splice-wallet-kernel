---
title: 'Parties & Transactions'
description: 'Read parties, sign messages, execute transactions, and query the ledger.'
---

Once a wallet is connected, your dApp can read the user's Canton parties, sign messages,
submit transactions, and query the ledger through the authenticated session.

All examples use the high-level SDK. For the equivalent low-level calls, see the
[Provider API](../reference/provider-api.md).

## List the user's parties

A user may have access to multiple Canton parties (accounts). List them and find the one
they marked as primary.

```typescript
const accounts = await sdk.listAccounts()
const primary = accounts.find((a) => a.primary)
```

## Get the primary party

If you only need the primary account, read it directly.

```typescript
const account = await sdk.getPrimaryAccount()
console.log(account.partyId)
```

> [!WARNING]
> Do not assume the primary party never changes. The user can switch it in their wallet.
> Subscribe to `onAccountsChanged` (below) and re-read the primary party rather than caching
> it indefinitely.

## React to account changes

```typescript
const handler = (accounts) => {
    const primary = accounts.find((a) => a.primary)
    setActiveParty(primary?.partyId)
}

sdk.onAccountsChanged(handler)
// On unmount: sdk.offAccountsChanged(handler)
```

## Read the active network

```typescript
const network = await sdk.getActiveNetwork()
console.log(network.networkId) // e.g. 'canton:da-mainnet'
```

Validate the network before submitting transactions so your dApp does not act against an
unexpected network.

## Sign a message

Sign an arbitrary human-readable string with the primary account. Show the user what they
are signing before you request it.

```typescript
const signature = await sdk.signMessage('Sign in to Example dApp')
```

## Execute a transaction

`prepareExecute()` handles the full lifecycle: it prepares the Daml commands, requests the
user's approval and signature in their wallet, and submits the transaction to the ledger.

```typescript
const account = await sdk.getPrimaryAccount()

await sdk.prepareExecute({
    commands: [
        {
            CreateCommand: {
                templateId: '<your-package>:<Module>:<Template>',
                createArguments: {
                    // template fields
                },
            },
        },
    ],
})
```

> [!NOTE]
> For a first end-to-end test you can use the built-in `Ping` template
> (`#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping`) to prove the round-trip works. For a real
> dApp, submit commands from your own Daml package.

## Track a transaction

Subscribe to `onTxChanged` to follow a transaction through its lifecycle
(`pending` → `signed` → `executed`, or `failed`).

```typescript
sdk.onTxChanged((tx) => {
    if (tx.status === 'executed') {
        console.log('Update ID:', tx.payload.updateId)
    } else if (tx.status === 'failed') {
        // Surface the failure to the user
    }
})
```

## Query the ledger

Proxy authenticated requests to the Canton JSON Ledger API through the user's session.

```typescript
const response = await sdk.ledgerApi({
    requestMethod: 'GET',
    resource: '/v2/version',
})

console.log(JSON.parse(response.response))
```

Use this to read ledger data (contracts, events, version) without standing up your own
authenticated Ledger API client.

## Next steps

- [Wallet Discovery](wallet-discovery.md) — Customize the wallet picker and add WalletConnect or custom remote wallets.
- [API Reference](../reference/sdk-methods.md) — Full signatures, parameters, and return types.
