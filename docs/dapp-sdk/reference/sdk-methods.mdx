---
title: 'SDK Methods'
description: 'Reference for the high-level dApp SDK methods.'
---

## Lifecycle

### `init(options?)`

Registers wallet adapters and silently restores a previous session **without** opening the
wallet picker. Call once, early in the app lifecycle.

| Parameter                    | Type        | Description                                                              |
| ---------------------------- | ----------- | ------------------------------------------------------------------------ |
| `options.additionalAdapters` | `Adapter[]` | Extra adapters to register alongside the defaults.                       |
| `options.defaultAdapters`    | `Adapter[]` | Replaces the default list of remote wallets. Pass `[]` to register none. |

### `connect()`

Opens the wallet picker and establishes a connection, running the authentication flow if
needed. Returns a result indicating whether the connection succeeded.

### `disconnect()`

Ends the session between the dApp and the wallet.

## Status

### `status()`

Returns network- and session-related information for the current connection.

### `isConnected()`

Returns whether the user is connected **without** triggering the login flow. Safe to call
on page load.

### `getActiveNetwork()`

Returns details about the network the wallet is connected to.

## Accounts

### `listAccounts()`

Returns all parties the user has access to.

### `getPrimaryAccount()`

Returns the account the user marked as primary.

## Signing & transactions

### `signMessage(message)`

Signs an arbitrary string with the primary account.

| Parameter | Type     | Description          |
| --------- | -------- | -------------------- |
| `message` | `string` | The message to sign. |

### `prepareExecute(commands)`

Prepares, requests signature for, and executes a Daml transaction.

| Parameter  | Type                      | Description                   |
| ---------- | ------------------------- | ----------------------------- |
| `commands` | `{ commands: Command[] }` | The Daml commands to execute. |

### `ledgerApi(request)`

Proxies an authenticated request to the Canton JSON Ledger API.

| Parameter               | Type     | Description                            |
| ----------------------- | -------- | -------------------------------------- |
| `request.requestMethod` | `string` | HTTP method, e.g. `'GET'`.             |
| `request.resource`      | `string` | Ledger API path, e.g. `'/v2/version'`. |

## Provider access

### `getConnectedProvider()`

Returns the raw CIP-103 provider for the active discovery session, or `null` if not
connected. Use it for direct `provider.request(...)` calls or provider-level events.

## Related

- [Events](events.md) — Subscribe to status, account, and transaction changes.
- [Provider API](provider-api.md) — The low-level CIP-103 interface.
