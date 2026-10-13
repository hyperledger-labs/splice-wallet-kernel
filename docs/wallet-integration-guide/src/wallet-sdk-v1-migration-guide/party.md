---
title: 'Party Namespace'
description: 'Migrate party management from Wallet SDK v0 to v1.'
---

The party namespace provides methods to manage wallet parties on the Canton Network. In v1, the party namespace replaces the stateful party management from v0.

## Availability

The party namespace is always available as part of the basic SDK interface. It's initialized automatically when you create an SDK instance and doesn't require additional configuration via `extend()`.

[`snippets/party.ts`](../../examples/snippets/party.ts) <!-- include -->

## Key changes from v0 to v1

v0 used a stateful approach where you set a party context once with `sdk.setPartyId()`. All subsequent operations acted on that party.

v1 uses an explicit approach where you pass the party ID to each operation. This enables:

- Thread-safe concurrent operations
- Multi-party transactions within the same application
- Clearer code intent

<!-- before-after -->

```javascript
sdk.setPartyId(myPartyId)
const result = await sdk.userLedger.doSomething()
```

---

```javascript
const result = await sdk.ledger
    .prepare({ partyId: myPartyId, ... })
    .sign(privateKey)
    .execute({ partyId: myPartyId })
```

<!-- /before-after -->

Refer to [Preparing and signing a transaction](../preparing-and-signing-transactions/index.md) for more information.

## Party types

**Internal parties**

<!-- before-after -->

```javascript
const internalParty =
await sdk.adminLedger!.allocateInternalParty(partyHint)
```

---

```javascript
// v1 - no state, explicit party ID
const internalParty = await sdk.party.internal.allocate({
    partyHint: 'my-service',
    synchronizerId: 'my-synchronizer-id',
})
```

<!-- /before-after -->

The below example demonstrates the full usage of the feature:

[Full example: allocate, list, and multi-host parties](../../examples/scripts/03-parties.ts) <!-- include title="Full example: allocate, list, and multi-host parties" expandable -->

**External parties**

An external party uses an external key pair for signing. You provide the public key, and the SDK generates the topology. You then sign the topology transaction with your private key and execute it on the ledger.

<!-- before-after -->

```javascript
const party = await sdk.userLedger?.signAndAllocateExternalParty(
    privateKey,
    partyHint
)
```

---

```javascript
const party = await sdk.party.external
    .create(publicKey, { partyHint: 'my-party' })
    .sign(privateKey)
    .execute()
```

<!-- /before-after -->

> [!NOTE]
> We recommend always providing a `partyHint` when creating a party. Refer to [Choosing a party hint](../party-management/index.md#choosing-a-party-hint) for more details.

## Listing parties

<!-- before-after -->

```javascript
const wallets = await sdk.userLedger?.listWallets()
```

---

```javascript
const partyIds = await sdk.party.list()
```

<!-- /before-after -->

This method returns all parties where the user has `CanActAs`, `CanReadAs`, or `CanExecuteAs` rights. If the user has admin rights, all local parties are returned.

## Offline signing workflow

<!-- before-after -->

```javascript
const preparedParty = await sdk.userLedger?.generateExternalParty(
    keyPair.publicKey,
    partyHint
)
const allocatedParty = await sdk.userLedger?.allocateExternalParty(
    signature,
    preparedParty
)
```

---

```javascript
const party = await sdk.party.external
    .create(publicKey, options)
    .execute(signature, executeOptions)
```

<!-- /before-after -->

## Migration reference

| v0 method                                                            | v1 method                                                                      |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `sdk.setPartyId(partyId)`                                            | Pass `partyId` explicitly to each operation                                    |
| `sdk.userLedger.listWallets()`                                       | `sdk.party.list()`                                                             |
| `sdk.userLedger.signAndAllocateExternalParty(privateKey, partyHint)` | `sdk.party.external.create(publicKey, {partyHint}).sign(privateKey).execute()` |
| `sdk.topology?.prepareExternalPartyTopology()`                       | `sdk.party.external.create().prepare()` (implicit on create)                   |
| `sdk.topology?.submitExternalPartyTopology()`                        | `sdk.party.external.create().sign().execute()`                                 |

## See also

- [v0 to v1 migration overview](./index.md)
- [Migration cheat sheet](./migration-cheat-sheet.md)
- [Configuration](../wallet-sdk-configuration/index.md) — SDK configuration
- [Creating an external party](../party-management/index.md) — External party onboarding
- [Preparing and signing a transaction](../preparing-and-signing-transactions/index.md) — Transaction lifecycle
