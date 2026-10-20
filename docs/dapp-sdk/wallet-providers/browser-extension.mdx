---
title: 'Browser Extension'
description: 'Make a browser-extension wallet discoverable by announcing it to dApps.'
---

A browser-extension wallet becomes discoverable by announcing itself with an event, or by
being registered explicitly by the host dApp. Extensions communicate with the dApp over
targeted `postMessage` and implement the synchronous
[dApp API](../reference/provider-api.md#sync-and-async-apis).

> [!NOTE]
> The SDK does **not** scan `window` for injected providers (for example `window.canton` or
> `window.canton.<brand>`). A browser wallet must announce itself or be registered via
> `additionalAdapters` to appear in the picker.

## Announce your provider

The SDK uses an [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963)-style request/announce
pair with Canton-specific event names.

| Direction      | Event                     | Payload (`detail`)                                                     |
| -------------- | ------------------------- | ---------------------------------------------------------------------- |
| dApp → wallets | `canton:requestProvider`  | Optional, may be `{}`                                                  |
| Wallet → dApp  | `canton:announceProvider` | `id` (required), `name` (required), optional `icon`, optional `target` |

Respond to the request by announcing yourself:

```javascript
window.addEventListener('canton:requestProvider', () => {
    window.dispatchEvent(
        new CustomEvent('canton:announceProvider', {
            detail: {
                id: 'com.example.mywallet',
                name: 'My Wallet',
                icon: 'data:image/svg+xml;base64,...',
                target: 'com.example.mywallet',
            },
        })
    )
})
```

The SDK collects announcements for a short window (~300 ms), then registers one
`ExtensionAdapter` per `id` with `providerId` `browser:ext:<id>`. Your extension must still
pass `detect()` (be visible and complete the handshake), and if you set `target`, your
content script should only handle `SPLICE_WALLET_*` / RPC traffic whose `target` matches.

A wallet may still expose a provider on `window.canton` for dApps that integrate directly,
but the SDK does not discover wallets by scanning that global. `ExtensionAdapter.detect()`
does treat `window.canton` as a positive signal when checking whether an announced
extension is present.

## Getting dApps to list your wallet

If your wallet is not auto-discovered, dApps can register it explicitly with an
`ExtensionAdapter`. Give integrating dApps a stable, unique `providerId` and the `target`
your extension filters on. The dApp-side registration steps are covered in
[Wallet discovery](../guides/wallet-discovery.md).

## Next steps

- [CIP-103 Specification](https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md) — Ensure your provider implements the required methods and events.
