# @canton-network/core-signing-store-wxt

A WxtStore is a browser-extension implementation of the `SigningDriverStore` interface from `@canton-network/core-signing-lib` backed by `@wxt-dev/storage`.

This store persists signing keys, signing transactions, and per driver configuration in the extension's local storage area.

The extension is single-user, so all data for a given record type is kept in a single flat array under one storage key rather than one storage imem per record plus separate lookup indexes.

| Data                 | Storage key                    | Shape                      |
| :------------------- | :----------------------------- | :------------------------- |
| Signing Keys         | local:signingKeys              | SigningKeyRecord[]         |
| Signing Transactions | local:signingTransactions      | SigningTransactionRecord[] |
| Driver config        | local: signingDriverConfigItem | SigningDriverConfigRecord  |

Writes to signing transactions read the whole array and then replace it. `WxtStore` runs these writes one at a time through a module-level queue that all instances in the same JavaScript context share, so concurrent writes do not drop each other's records. A failed write rejects only its own call. The queue does not coordinate across extension contexts, so only one context should write signing transactions. In the extension this is the background script.

# Usage

```ts
import { WxtStore } from '@canton-network/core-signing-store-wxt'

const userId = 'myUser'
const store = new WxtStore(userId)
await store.setSigningKey(userId, {
    id: 'key1',
    name: 'pkey1',
    publicKey: '...',
    privateKey: '...',
    createdAt: new Date(),
    updatedAt: new Date(),
})

const key = await store.getSigningKeyByName(userId, 'pkey1')
const allKeys = await store.listSigningKeys(userId)
```
