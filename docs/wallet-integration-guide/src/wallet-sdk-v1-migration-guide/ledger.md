---
title: 'Ledger Namespace'
description: 'Migrate prepare/sign/execute, ACS, and DAR operations from v0 to v1.'
---

The ledger namespace is used for preparing, signing, and executing transactions and other Ledger API operations.

## Availability

The ledger namespace is always available as part of the basic SDK interface. It's initialized automatically when you create an SDK instance and doesn't require additional configuration via `extend()`.

[`snippets/ledger.ts`](../../examples/snippets/ledger.ts) <!-- include -->

## Key changes from v0 to v1

v0 used the `userLedger` or `adminLedger` controller with implicit party context set via `sdk.setPartyId()`.

v1 uses the `ledger` namespace where you:

- Pass `partyId` explicitly to each operation
- Have an explicit lifecycle with `prepare/sign/execute` chain instead of a single method
- Access operations through logical groupings (`external`, `internal`, `dar`, and `acs`)

**Prepare, signing, and executing transactions**

Previously, a single method would handle everything.

<!-- before-after -->

```javascript
await sdk.userLedger.prepareSignExecuteAndWaitFor(
    commands,
    privateKey,
    workFlowId,
    disclosedContracts
)
```

---

```javascript
await sdk.ledger
      .prepare({
         partyId: partyId,
         commands: [...],
      })
      .sign(privateKey)
      .execute({
         partyId: partyId,
      })
```

<!-- /before-after -->

Each step in lifecycle is clearer, workflowIds are generated automatically and there is better typesafety at each step.

The below example demonstrates how offline signing works.

[Full example: online and offline signing](../../examples/scripts/01-init.ts) <!-- include title="Full example: online and offline signing" expandable -->

**Active Contract Set (ACS) queries**

<!-- before-after -->

```javascript
const contracts = await sdk.userLedger.activeContracts({
   offset,
   templateIds: [...],
   parties: [],
   filterByParty: true
})

const contractId = LedgerController.getActiveContractCid(contracts?.[0]?.contractEntry!)
```

---

```javascript
const contracts = await sdk.ledger.acs.read({
   parties: [...],
   templateIds: [...],
   filterByParty: true
})

const contractId = contracts[0].contractId
```

<!-- /before-after -->

No need to manually enter get the ledger end for the offset and there is direct extraction of the activeContracts. However, we still have an `acs.readRaw` method for unfiltered results.

**DAR management**

<!-- before-after -->

```javascript
const isPackageUploaded = await sdk.userLedger.isPackageUploaded(PACKAGED_ID)

if (!isPackageUploaded) {
    await sdk.adminLedger.uploadDar(darBytes)
}
```

---

```javascript
//automatically checks if uploaded and skips if present
await sdk.ledger.dar.upload(darBytes, packageId)
```

<!-- /before-after -->

## Migration reference

| v0 method                                     | v1 method                                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `sdk.userLedger.prepareSignExecuteAndWaitFor` | `sdk.ledger.prepare({partyId, commands, disclosedContracts}).sign(privateKey).execute(partyId)` |
| `sdk.userLedger.activeContracts`              | `sdk.ledger.acs.read`                                                                           |
| `sdk.adminLedger.uploadDar`                   | `sdk.ledger.dar.upload`                                                                         |
| `sdk.userLedger.isPackageUploaded`            | `sdk.ledger.dar.check`                                                                          |

## See also

- [v0 to v1 migration overview](./index.md)
- [Migration cheat sheet](./migration-cheat-sheet.md)
- [Configuration](../wallet-sdk-configuration/index.md) — SDK configuration
- [Preparing and signing a transaction](../preparing-and-signing-transactions/index.md) — Transaction lifecycle
