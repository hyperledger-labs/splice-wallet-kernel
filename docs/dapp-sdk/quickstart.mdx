---
title: 'Quickstart'
description: 'Install the dApp SDK and build a working wallet connection in a few minutes.'
---

This is the shortest working integration: install the SDK, initialize it, let the user
connect a wallet, read their party, and submit a transaction. It uses only the high-level
SDK. You do not need the Provider API to build a dApp.

## Install the SDK

### npm

```shell
npm install @canton-network/dapp-sdk
```

### pnpm

```shell
pnpm add @canton-network/dapp-sdk
```

## Initialize on app load

Call `init()` once, early in your app's lifecycle. This registers the default wallet
adapters and silently restores a previous session **without** opening the wallet picker.

```typescript
import * as sdk from '@canton-network/dapp-sdk'

await sdk.init()
```

## Connect a wallet

Call `connect()` in response to a user action (for example, a "Connect wallet" button).
This opens the wallet picker and runs the authentication flow.

```typescript
async function onConnectClick() {
    const result = await sdk.connect()
    console.log('Connected:', result.isConnected)
}
```

## Read the connected party

Once connected, read the account the user marked as primary.

```typescript
const account = await sdk.getPrimaryAccount()
console.log('Primary party:', account.partyId)
```

## Submit a transaction

Use `prepareExecute()` to submit Daml commands. The SDK prepares the transaction, asks
the user to approve and sign it in their wallet, and submits it to the ledger.

```typescript
const account = await sdk.getPrimaryAccount()

await sdk.prepareExecute({
    commands: [
        {
            CreateCommand: {
                templateId:
                    '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
                createArguments: {
                    id: `ping-${Date.now()}`,
                    initiator: account.partyId,
                    responder: account.partyId,
                },
            },
        },
    ],
})
```

> [!NOTE]
> This example uses the built-in `Ping` template to prove the round-trip works. For a real
> dApp, submit commands from your own Daml package. See
> [Parties & transactions](guides/parties-and-transactions.md) for details.

## Handle disconnect

Let the user end their session.

```typescript
async function onDisconnectClick() {
    await sdk.disconnect()
}
```

## Next steps

- [Connect & Sessions](guides/connect-and-sessions.md) — Connect, restore sessions, check status, and disconnect.
- [Parties & Transactions](guides/parties-and-transactions.md) — Work with parties, sign messages, execute transactions, and query the ledger.
- [Wallet Discovery](guides/wallet-discovery.md) — Customize the wallet picker and add WalletConnect or custom remote wallets.
