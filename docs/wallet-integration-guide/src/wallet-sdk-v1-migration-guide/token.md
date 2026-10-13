---
title: 'Token Namespace'
description: 'Migrate token transfers, holdings, UTXOs, and allocations from v0 to v1.'
---

The token namespace provides methods to manage token operations including transfers, holdings, UTXOs, and allocations on the Canton Network. In v1, the token namespace replaces the `tokenStandard` controller from v0.

## Availability and extensibility

The token namespace is an extended namespace that requires configuration. You can initialize it either during SDK creation or later using the `extend()` method.

**Option 1: Initialize during SDK creation**

[`snippets/token.ts`](../../examples/snippets/token.ts) <!-- include -->

**Option 2: Add token namespace later using extend()**

[`snippets/token-extended.ts`](../../examples/snippets/token-extended.ts) <!-- include -->

## Key changes from v0 to v1

v0 used the `tokenStandard` controller with implicit party context set via `sdk.setPartyId()`.

v1 uses the `token` namespace where you:

- Pass `partyId` explicitly to each operation
- Initialize the namespace with configuration
- Access operations through logical groupings (`transfer`, `utxos`, `allocation`)

<!-- before-after -->

```javascript
sdk.setPartyId(myPartyId)
const holdings = await sdk.tokenStandard?.listHoldingTransactions()
```

---

```javascript
const holdings = await sdk.token.holdings({ partyId: myPartyId })
```

<!-- /before-after -->

This enables thread-safe concurrent operations and clearer code organization.

## Transfers

**Creating transfers**

<!-- before-after -->

```javascript
const transfer = await sdk.tokenStandard.createTransfer(
    senderPartyId,
    recipientPartyId,
    amount.toString(),
    {
        instrumentId: 'Amulet',
        instrumentAdmin: instrumentAdminPartyId,
    },
    registryUrl,
    memo
)
```

---

```javascript
const [command, disclosedContracts] = await sdk.token.transfer.create({
    sender: senderPartyId,
    recipient: recipientPartyId,
    amount: amount.toString(),
    instrumentId: 'Amulet',
    registryUrl,
    inputUtxos: ['utxo-1', 'utxo-2'],
    memo: 'Payment for services',
})
```

<!-- /before-after -->

**Accepting, rejecting, or withdrawing transfers**

<!-- before-after -->

```javascript
await sdk.tokenStandard.exerciseTransferInstructionChoice(
    transferCid,
    choiceType /* 'Accept' | 'Withdraw' | 'Reject' */
)
```

---

```javascript
// Accept transfer
const [acceptCommand, disclosed1] = await sdk.token.transfer.accept({
    transferInstructionCid,
    registryUrl,
})

// Reject transfer
const [rejectCommand, disclosed2] = await sdk.token.transfer.reject({
    transferInstructionCid,
    registryUrl,
})

// Withdraw transfer
const [withdrawCommand, disclosed3] = await sdk.token.transfer.withdraw({
    transferInstructionCid,
    registryUrl,
})
```

<!-- /before-after -->

**Listing pending transfers**

<!-- before-after -->

```javascript
await sdk.setPartyId(partyId)
const pending = await sdk.tokenStandard.fetchPendingTransferInstructionView()
```

---

```javascript
const pending = await sdk.token.transfer.pending(myPartyId)
```

<!-- /before-after -->

## Holdings

Holdings represent the transaction history of token ownership for a party.

<!-- before-after -->

```javascript
await sdk.setPartyId(partyId)
const holdings = await sdk.tokenStandard.listHoldingTransactions()
```

---

```javascript
const holdings = await sdk.token.holdings({ partyId })
```

<!-- /before-after -->

You can also specify offsets for pagination:

```javascript
const holdings = await sdk.token.holdings({
    partyId,
    afterOffset: 10,
    beforeOffset: 100,
})
```

Transactions by updateId:

<!-- before-after -->

```javascript
await sdk.setPartyId(partyId)
const tx = await sdk.tokenStandard.getTransactionById('my-update-id')
```

---

```javascript
const tx = await sdk.token.transactionsById({ updateId, partyId })
```

<!-- /before-after -->

## UTXOs

UTXOs (Unspent Transaction Outputs) are the actual holding contracts that represent token balances.

**Listing UTXOs**

<!-- before-after -->

```javascript
await sdk.setPartyId(partyId)
// List all UTXOs including locked ones
const allUtxos = await sdk.tokenStandard?.listHoldingUtxos()

// List only unlocked UTXOs
const usableUtxos = await sdk.tokenStandard?.listHoldingUtxos(false)
```

---

```javascript
// List only unlocked UTXOs (default)
const usableUtxos = await sdk.token.utxos.list({
    partyId,
})

// List all UTXOs including locked ones
const allUtxos = await sdk.token.utxos.list({
    partyId,
    includeLocked: true,
})
```

<!-- /before-after -->

You can specify additional parameters for pagination and limits:

```javascript
const utxos = await sdk.token.utxos.list({
    partyId,
    includeLocked: false,
    limit: 100,
    offset: 0,
    continueUntilCompletion: false,
})
```

**Merging UTXOs**

Merging consolidates multiple small UTXOs into larger ones to improve performance.

<!-- before-after -->

```javascript
await sdk.setPartyId(partyId)
const [commands, disclosedContracts] =
    await sdk.tokenStandard.mergeHoldingUtxos(nodeLimit)
```

---

```javascript
const [commands, disclosedContracts] = await sdk.token.utxos.merge({
    partyId,
    nodeLimit: 200,
    memo: 'merge-utxos',
})
```

<!-- /before-after -->

The merge operation groups UTXOs by instrument and creates self-transfers to consolidate them. You can optionally provide specific UTXOs to merge:

```javascript
const [commands, disclosedContracts] = await sdk.token.utxos.merge({
    partyId,
    inputUtxos,
    memo: 'custom merge',
})
```

## Allocation

Allocations handle the issuance and distribution of new tokens.

**Listing pending allocations**

<!-- before-after -->

```javascript
await sdk.setPartyId(partyId)
// Allocation requests
const requests = await sdk.tokenStandard.fetchPendingAllocationRequestView()

// Allocation instructions
const instructions =
    await sdk.tokenStandard.fetchPendingAllocationInstructionView()

// Allocations
const allocations = await sdk.tokenStandard.fetchPendingAllocationView()
```

---

```javascript
// All pending allocations (default)
const allocations = await sdk.token.allocation.pending(myPartyId)
```

<!-- /before-after -->

The `pending` method accepts an optional interface ID to filter by allocation type:

```javascript
import {
    ALLOCATION_REQUEST_INTERFACE_ID,
    ALLOCATION_INSTRUCTION_INTERFACE_ID,
    ALLOCATION_INTERFACE_ID,
} from '@canton-network/core-token-standard'

// Filter by specific type
const requests = await sdk.token.allocation.pending(
    myPartyId,
    ALLOCATION_REQUEST_INTERFACE_ID
)
```

**Executing, withdrawing or cancelling allocations**

<!-- before-after -->

```javascript
const [command, disclosedContracts] =
    await sdk.tokenStandard.exerciseAllocationChoice(
        allocationCid,
        choice /* 'ExecuteTransfer' | 'Withdraw' | 'Cancel' */
    )
```

---

```javascript
// Execute allocation
const [executeCommand, disclosedContracts1] =
    await sdk.token.allocation.execute({
        allocationCid,
        asset,
    })

// Withdraw allocation
const [withdrawCommand, disclosedContracts2] =
    await sdk.token.allocation.withdraw({
        allocationCid,
        asset,
    })

// Cancel allocation
const [cancelCommand, disclosedContracts3] = await sdk.token.allocation.cancel({
    allocationCid,
    asset,
})
```

<!-- /before-after -->

## Migration reference

| v0 method                                                 | v1 method                                                                                 |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `sdk.tokenStandard.createTransfer`                        | `sdk.token.transfer.create`                                                               |
| `sdk.tokenStandard.exerciseTransferInstructionChoice`     | `sdk.token.transfer.accept` / `sdk.token.transfer.reject` / `sdk.token.transfer.withdraw` |
| `sdk.tokenStandard.fetchPendingTransferInstructionView`   | `sdk.token.transfer.pending`                                                              |
| `sdk.tokenStandard.listHoldingTransactions({partyId})`    | `sdk.token.holdings({partyId})`                                                           |
| `sdk.tokenStandard.listHoldingUtxos()`                    | `sdk.token.utxos.list({partyId})`                                                         |
| `sdk.tokenStandard.mergeHoldingUtxos`                     | `sdk.token.utxos.merge`                                                                   |
| `sdk.tokenStandard.fetchPendingAllocationRequestView`     | `sdk.token.allocation.pending(partyId, ALLOCATION_REQUEST_INTERFACE_ID)`                  |
| `sdk.tokenStandard.fetchPendingAllocationInstructionView` | `sdk.token.allocation.pending(partyId, ALLOCATION_INSTRUCTION_INTERFACE_ID)`              |
| `sdk.tokenStandard.fetchPendingAllocationView`            | `sdk.token.allocation.pending(partyId)`                                                   |

## See also

- [v0 to v1 migration overview](./index.md)
- [Migration cheat sheet](./migration-cheat-sheet.md)
- [Configuration](../wallet-sdk-configuration/index.md) — SDK configuration
- [Preparing and signing a transaction](../preparing-and-signing-transactions/index.md) — Transaction lifecycle
