---
title: 'Provider API'
description: 'The low-level CIP-103 provider interface behind the dApp SDK.'
---

The **Provider API** is the low-level interface the dApp SDK is built on. It follows the
[EIP-1193](https://eips.ethereum.org/EIPS/eip-1193) request/event pattern and implements
[CIP-103](https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md).

> [!NOTE]
> Most dApps should use the [high-level SDK](sdk-methods.md).
> Use the Provider API directly only when building lower-level infrastructure or adapting an
> existing provider-based integration.

## OpenRPC specifications

The dApp API is specified in machine-readable OpenRPC documents:

- **Sync API**: [openrpc-dapp-api.json](https://github.com/canton-network/wallet/blob/main/api-specs/openrpc-dapp-api.json)
- **Async API**: [openrpc-dapp-remote-api.json](https://github.com/canton-network/wallet/blob/main/api-specs/openrpc-dapp-remote-api.json)

## Getting a provider

After connecting, obtain the active CIP-103 provider from the SDK:

```typescript
await sdk.init()
await sdk.connect()
const provider = sdk.getConnectedProvider()
if (!provider) throw new Error('Not connected')
```

## Methods

Every operation is a `request({ method, params })` call. The methods mirror the SDK
functions one-to-one.

| Method              | Output              | Description                                             |
| ------------------- | ------------------- | ------------------------------------------------------- |
| `connect`           | `ConnectResult`     | Establishes a connection to the wallet.                 |
| `disconnect`        | `void`              | Closes the session between the client and the provider. |
| `isConnected`       | `ConnectResult`     | Reports connectivity without triggering login.          |
| `status`            | `StatusEvent`       | Information about the connected wallet and network.     |
| `getActiveNetwork`  | `Network`           | Details of the connected network.                       |
| `listAccounts`      | `Account[]`         | Lists all accounts the user has access to.              |
| `getPrimaryAccount` | `Account`           | Returns the account set as primary.                     |
| `signMessage`       | `SignMessageResult` | Signs an arbitrary string message.                      |
| `prepareExecute`    | `void`              | Prepares, signs, and executes Daml commands.            |
| `ledgerApi`         | `string`            | Proxies requests to the JSON Ledger API.                |

```typescript
// Connect
const result = await provider.request<ConnectResult>({ method: 'connect' })

// Disconnect
await provider.request({ method: 'disconnect' })

// Status
const status = await provider.request<StatusEvent>({ method: 'status' })

// Is connected (no login)
const { isConnected } = await provider.request<ConnectResult>({
    method: 'isConnected',
})

// Active network
const network = await provider.request<Network>({ method: 'getActiveNetwork' })

// List accounts
const accounts = await provider.request<Account[]>({ method: 'listAccounts' })

// Primary account
const account = await provider.request<Account>({ method: 'getPrimaryAccount' })

// Sign a message
const signature = await provider.request<string>({
    method: 'signMessage',
    params: { message: 'Hello, Canton!' },
})

// Execute a transaction
await provider.request({
    method: 'prepareExecute',
    params: { commands: [/* ... */] },
})

// Call the Ledger API
const response = await provider.request<LedgerApiResponse>({
    method: 'ledgerApi',
    params: { requestMethod: 'GET', resource: '/v2/version' },
})
```

## Events

Subscribe with `on` and clean up with `removeListener`.

```typescript
const handler = (status: StatusEvent) =>
    console.log(status.connection.isConnected)

provider.on('statusChanged', handler)
provider.removeListener('statusChanged', handler)
```

The provider emits `statusChanged`, `accountsChanged`, and `txChanged`. The Async API
also emits `connected` and `messageSignature`. For payload shapes, see
[Events](events.md).

## Sync and Async APIs

The dApp API comes in two variants for different wallet deployments:

- **Sync API** targets wallets with direct access, such as browser extensions or desktop
  apps. Methods run in a standard request-response fashion.
- **Async API** targets server-side or remote wallets, where operations that need user
  interaction cannot block. Those methods return a `userUrl` for the user to complete the
  action (for example login or transaction approval), and the result arrives later as an
  event.

| Consideration    | Sync API                                 | Async API                   |
| ---------------- | ---------------------------------------- | --------------------------- |
| Deployment       | Client-side (browser extension, desktop) | Server-side, remote custody |
| User interaction | Direct, real-time                        | Via `userUrl` redirects     |
| Blocking calls   | Supported                                | Not supported               |
| Transport        | `postMessage`, in-app bridges            | HTTPS, SSE                  |

Key differences in the Async API:

- `connect` returns `{ ...ConnectResult, userUrl }` when no session exists; a `connected`
  event is emitted after login.
- `prepareExecute` returns `{ userUrl }`; a `txChanged` event is emitted after the prepare
  phase.

> [!NOTE]
> The dApp SDK implements the Sync API interface and relays to an Async API server internally,
> so dApp code written against the SDK works with both wallet types without changes.

## Provider interface

Both variants are accessed through a `Provider` interface, following
[EIP-1193](https://eips.ethereum.org/EIPS/eip-1193):

```typescript
interface Provider {
    request<T>(args: {
        method: string
        params?: unknown[] | Record<string, unknown>
    }): Promise<T>
    on<T>(event: string, listener: (...args: T[]) => void): Provider
    emit<T>(event: string, ...args: T[]): boolean
    removeListener<T>(event: string, listener: (...args: T[]) => void): Provider
}
```

## SDK vs Provider API

|          | dApp SDK                          | Provider API                                               |
| -------- | --------------------------------- | ---------------------------------------------------------- |
| Level    | High-level, convenient            | Low-level, EIP-1193 style                                  |
| Calls    | Named functions (`sdk.connect()`) | `provider.request({ method })`                             |
| Events   | `on*` / `off*` helpers            | `on` / `removeListener`                                    |
| Use when | Building a dApp                   | Building infrastructure or adapting existing provider code |

## Related

- [SDK Methods](sdk-methods.md) — The high-level equivalents of these request methods.
- [Errors](errors.md) — Standard error codes returned by the API.
