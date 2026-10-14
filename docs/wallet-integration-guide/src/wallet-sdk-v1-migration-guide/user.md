---
title: 'User Namespace'
description: 'Migrate user management and rights from Wallet SDK v0 to v1.'
---

The user namespace provides methods for user management on the Canton Network.

## Availability

The user namespace is always available as part of the basic SDK interface. It's initialized automatically when you create an SDK instance and doesn't require additional configuration via `extend()`.

[`snippets/user.ts`](../../examples/snippets/user.ts) <!-- include -->

## Key changes from v0 to v1

The distinction between the user ledger and admin ledger have been removed. Instead, the token is used to determine whether a user has admin rights.

**Creating users**

<!-- before-after -->

```typescript
await sdk.adminLedger.createUser('userId', primaryParty)
```

---

```typescript
const result = await sdk.user.create({
    userId: 'userId',
    primaryParty: primaryParty,
    userRights: { ... },
})
```

<!-- /before-after -->

**Granting user rights**

<!-- before-after -->

```typescript
await sdk.userLedger.grantRights([actAsRights], [readAsRights])
```

---

```typescript
const result = await sdk.rights.grant({
    userRights: { ... },
    userId: 'userId', // optional parameter
    idp: 'idp', // optional parameter otherwise will use default IDP
})
```

<!-- /before-after -->

The below example demonstrates the full usage of the feature:

[Full example: multi-user setup and rights](../../examples/scripts/09-multi-user-setup.ts) <!-- include title="Full example: multi-user setup and rights" expandable -->

## Migration reference

| v0 method                    | v1 method               |
| ---------------------------- | ----------------------- |
| `sdk.adminLedger.createUser` | `sdk.user.create`       |
| `sdk.userLedger.grantRights` | `sdk.user.rights.grant` |

## See also

- [v0 to v1 migration overview](./index.md)
- [Migration cheat sheet](./migration-cheat-sheet.md)
- [Configuration](../wallet-sdk-configuration/index.md) — SDK configuration
- [User management](../user-management/index.md) — User management overview
