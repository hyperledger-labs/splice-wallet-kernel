# Wallet providers

This guide is for **wallet and browser-extension authors** who want their product to show up in the **wallet discovery / picker** that the dApp SDK opens on `connect()`.
End-user dApps pull in adapters automatically; wallets choose one or more of the integration paths below.

Discovery runs in the browser (or any environment where `window` exists).
The SDK **merges** these sources, **deduplicates** by `providerId` where applicable, and then passes the list to the wallet picker UI.

## What the SDK registers by default on `connect()`

1. **`RemoteAdapter` entries** — Built-in and configured Wallet Gateway URLs (HTTP/SSE CIP-103 bridge).
2. **Injected providers from `window` (namespace scan)** — See [Injected / namespaced providers](#injected--namespaced-providers). These are registered **without** running adapter `detect()`; if the scan finds a provider-shaped object, a picker entry is added (including a direct `window.canton` provider).
3. **Announced extensions** — See [Announcement events (EIP-6963-style)](#announcement-events-eip-6963-style). Each announcement becomes an `ExtensionAdapter` with a **distinct** `providerId` and optional `target`; **`detect()`** must succeed (extension visible and handshake OK).

Additionally, the host dApp may pass **`additionalAdapters`** (or configure `DiscoveryClient` directly) to register more `ExtensionAdapter`, `RemoteAdapter`, or custom adapters.

## Remote Wallets (`RemoteAdapter`)

Server-side wallets (such as the Wallet Gateway) are **not** injected into the page; they are listed as remote entries with an RPC URL.
Bundled defaults come from the SDK’s gateway list; dApps can add more via `connect({ additionalAdapters: [...] })` or by constructing `DiscoveryClient` with extra `RemoteAdapter` instances.

## Injected / namespaced providers

The SDK scans **global roots** on `window` for objects that look like a CIP-103 **`Provider`** (`request`, `on`, `emit`, `removeListener`).

**Roots scanned today** (each entry is optional; missing roots are skipped):

| Global root           | Purpose                                                                               |
| --------------------- | ------------------------------------------------------------------------------------- |
| `window.canton`       | Common CIP-103 global; may be a provider **or** a bag of named providers (see below). |
| `window.splice`       | Splice / alternate global.                                                            |
| `window.cantonWallet` | Alternate global used by some integrations.                                           |

**Direct provider:** If `window.<root>` itself is provider-shaped, discovery adds one entry. Its stable id is the root name (e.g. `canton`), and the picker uses an adapter with `providerId` `browser:<id>` (e.g. `browser:canton`).

**Namespaced bag:** If `window.<root>` is a plain object, **each own property** whose value is provider-shaped becomes a separate entry with id `<root>.<key>` (e.g. `canton.myBrand`), i.e. `providerId` `browser:canton.myBrand`.

**Why namespace:** `window.canton.myWallet` allows **multiple** extensions or scripts to expose distinct providers **without** overwriting a single shared `window.canton` reference.

If nothing provider-shaped appears on a scanned root, the picker will not list your wallet until you [**announce**](#announcement-events-eip-6963-style) or register an **`ExtensionAdapter`** via **`additionalAdapters`** (see below—e.g. when you only bridge over `postMessage`).

## Announcement events (EIP-6963-style)

Ethereum’s [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963) uses a request/announce event pair so each wallet can identify itself without fighting over one global. The dApp SDK uses the same **pattern** with Canton-specific event names:

| Direction      | Event name                | Payload (`detail`)                                                                                     |
| -------------- | ------------------------- | ------------------------------------------------------------------------------------------------------ |
| dApp → wallets | `canton:requestProvider`  | Optional; may be `{}`                                                                                  |
| Wallet → dApp  | `canton:announceProvider` | **`id`** (string, required), **`name`** (string, required), optional **`icon`**, optional **`target`** |

**Behavior:**

- After the dApp dispatches `canton:requestProvider`, wallets should **`dispatchEvent(new CustomEvent('canton:announceProvider', { detail: { ... } }))`** on `window`.
- The SDK collects announcements for a short window (~300 ms by default), then registers one **`ExtensionAdapter` per `id`** with `providerId` `browser:ext:<id>`, display `name`, and routing `target` defaulting to `id` when omitted.
- The extension must still **pass `detect()`**: ready/ack or `window.canton` as implemented in `ExtensionAdapter`, and if you use **`target`**, the content script should only handle `SPLICE_WALLET_*` / RPC traffic whose **`target`** matches (so the correct extension answers).

## Explicit registration by the dApp (`additionalAdapters`)

A wallet can ship instructions for dApps to register a dedicated adapter:

```typescript
import * as sdk from '@canton-network/dapp-sdk'
import { ExtensionAdapter } from '@canton-network/dapp-sdk'

await sdk.connect({
    additionalAdapters: [
        new ExtensionAdapter({
            providerId: 'browser:com.example.mywallet', // must be unique in the picker (typed as ProviderId in app code)
            name: 'My Wallet',
            target: chrome.runtime.id, // postMessage routing key; must match your extension
        }),
    ],
})
```

Use a **stable, unique** `providerId` string and the same **`target`** your extension filters on for `WindowTransport` / splice messages.

## Summary: choose your integration

| Goal                                                    | Recommended approach                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Single extension, provider-shaped `window.canton`       | Namespace scan (injected) + CIP-103 `postMessage` / inject                                            |
| Multiple extensions or avoid `window.canton` collisions | **`canton:announceProvider`** + **`target`**, and/or **`window.canton.<brand>`** namespaced providers |
| In-page script / non-extension inject                   | Place provider at **`window.<root>`** or **`window.<root>.<name>`** under a scanned root              |
| Hosted gateway                                          | **`RemoteAdapter`** with public RPC URL                                                               |

Implementing [CIP-103](https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md) RPC and events on the resulting provider is **separate** from picker visibility: discovery only decides **that** a connection option exists; runtime behavior still must honor the spec for dApps to work correctly.
