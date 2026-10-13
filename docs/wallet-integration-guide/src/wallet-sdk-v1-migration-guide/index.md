---
title: 'SDK v0 to v1 Migration Guide'
description: 'Migrate the Wallet SDK from v0 to v1.'
---

Wallet SDK v1 is not backwards compatible with v0.

**Quick links**

- [Configuration](../wallet-sdk-configuration/index.md) — Detailed configuration guide
- [Preparing and signing a transaction](../preparing-and-signing-transactions/index.md) — Preparing and signing transactions
- [Migration cheat sheet](./migration-cheat-sheet.md) — Full v0 → v1 method lookup

We have removed the configure() and connect() pattern in favor of passing in a static configuration or a provider with ledger api capabilities.

Static configuration initialization where we supply an auth config and a ledgerClientUrl:

[`snippets/config-template.ts`](../../examples/snippets/config-template.ts) <!-- include -->

Provider intialization: The provider is an abstraction that ultimately interacts with the Ledger (JSON LAPI). This can be implemented for either a dApp consumer, direct ledger user, or alternative transport channels such as Wallet Connect.

```javascript
// Notice that `auth` and `ledgerClientUrl` are no longer needed
// when supplying sdk with custom provider
const sdk = await SDK.create(config, provider)
```

## Namespace changes

We have removed the controllers and replaced them with namespaces to appropriately segregate the service layer in terms of business context. When the sdk is initialized, it has access to the users, keys, ledger, and party namespaces. The amulet, token, asset, and events namespaces can be initialized with a separate config via the `.extend()` method.

## Find your migration path

Jump to the page that matches the work you are migrating:

<!-- cards cols=2 -->

- [Allocate or list parties](./party.md) <!-- icon: users --> Internal and external parties, offline signing, and replacing `setPartyId`.
- [Transfers, holdings, UTXOs, allocations](./token.md) <!-- icon: arrow-right-arrow-left --> Replace `tokenStandard` transfer, holding, UTXO, and allocation APIs.
- [Users and rights](./user.md) <!-- icon: user-gear --> Create users and grant rights without separate admin/user ledger controllers.
- [Canton Coin, traffic, preapprovals, tap](./amulet.md) <!-- icon: coins --> Migrate amulet-specific traffic, preapproval, featured-app, and tap flows.
- [Prepare, sign, execute, ACS, DARs](./ledger.md) <!-- icon: file-signature --> Replace `prepareSignExecuteAndWaitFor` with the prepare/sign/execute chain.
- [Discover assets and instruments](./asset.md) <!-- icon: magnifying-glass --> List and find instruments through the dedicated asset namespace.
- [Keys and events](./index.md#keys-and-events) <!-- icon: key --> Key generation and ledger update/completion subscriptions.
- [Full method cheat sheet](./migration-cheat-sheet.md) <!-- icon: table --> Searchable v0 controller → v1 namespace method mapping table.

<!-- /cards -->

## Removed functionality

The following methods have been removed:

`sdk.connect()` No longer needed, SDK is connected on creation `sdk.connectAdmin()` No longer needed, admin operations are available in the ledger namespace and rights are extracted from the token. `sdk.connectTopology()` No longer needed, the grpc endpoints have been removed and replaced with ledger api endpoints. `sdk.setPartyId()` Pass `partyId` explicitly to each operation

<!-- before-after -->

```javascript
sdk.setPartyId(myPartyId)
const holdingTransactionsmyPartyId =
    await sdk.tokenStandard?.listHoldingTransactions()
sdk.setPartyId(myPartyId2)
const holdingTransactionsmyPartyId2 =
    await sdk.tokenStandard?.listHoldingTransactions()
```

---

```javascript
const holdingTransactionsmyPartyId = await token.holdings(myPartyId)
const holdingTransactionsmyPartyId2 = await token.holdings(myPartyId2)
```

<!-- /before-after -->

In v0, the controllers and sdk were stateful. In v1, party information should be passed explicitly to each function. This enables acting as multiple parties and allows for thread safety in concurrent use.

## Keys and events

The **keys** namespace is always available on the basic SDK. Use it instead of standalone key-pair helpers:

| v0                | v1                    |
| ----------------- | --------------------- |
| `createKeyPair()` | `sdk.keys.generate()` |

The **events** namespace replaces ledger update and completion subscriptions from `userLedger`. Like `amulet`, `token`, and `asset`, it is an extended namespace that you configure at creation time or via `.extend()`:

| v0                                      | v1                       |
| --------------------------------------- | ------------------------ |
| `sdk.userLedger.subscribeToUpdates`     | `sdk.events.updates`     |
| `sdk.userLedger.subscribeToCompletions` | `sdk.events.completions` |

For the complete method map across all namespaces, see the [migration cheat sheet](./migration-cheat-sheet.md).

## See also

- [Configuration](../wallet-sdk-configuration/index.md)
- [User management](../user-management/index.md)
- [Preparing and signing a transaction](../preparing-and-signing-transactions/index.md)
- [Creating an external party](../party-management/index.md)
