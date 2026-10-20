---
title: 'Wallet Discovery'
description: 'Customize the wallet picker, add WalletConnect, and register custom remote wallets.'
---

By default, `sdk.init()` makes the wallet picker list every CIP-103 wallet the SDK can
discover: browser wallets that announce themselves, plus the SDK's built-in list of remote
wallets. Registering adapters lets you add more wallets (such as WalletConnect or a custom
remote wallet) or restrict the list.

The adapters you register in `init()` determine what the SDK can discover and what the
user sees in the **wallet picker** opened by `connect()`.

- If an adapter is registered (and passes `detect()`), it can appear as an entry in the picker.
- Session restore only works for adapters that are registered.

## Use the built-in remote wallets

Registering with no options uses the SDK's default remote wallet list (from `gateways.json`)
plus any wallets that announce via `canton:announceProvider`.

```typescript
await sdk.init()
```

By default, `init()` also loads the SDK's bundled **verified wallet** list from
`wallets.json` (see [Verified wallets](#verified-wallets)).

## Verified wallets

The SDK ships curated wallet lists for the picker. There are two bundled files, serving
different wallet types and roles:

| File                                                                                                 | Typical `type` values                    | Role                                                                                                                    |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [`gateways.json`](https://github.com/canton-network/wallet/blob/main/sdk/dapp-sdk/src/gateways.json) | `remote`                                 | Pre-registered **remote** wallets (`RemoteAdapter` defaults) — connectable entries in the main picker list              |
| [`wallets.json`](https://github.com/canton-network/wallet/blob/main/sdk/dapp-sdk/src/wallets.json)   | `browser`, `desktop`, `mobile`, `remote` | **Verified** wallets not yet available to the user — install or setup prompts shown when no matching wallet is detected |

### Verified wallet list (`wallets.json`)

When a wallet from this list is not already detected (matched by `providerId`), the picker
shows it under **Suggested Wallets** with links to install or set it up. Verified entries
are **not** registered as adapters.

On `init()`, when `enableSuggestedWallets` is `true` (the default), the bundled
`wallets.json` is passed to the picker UI.

**Example entry (browser extension):**

```json
{
    "name": "Example Wallet",
    "type": "browser",
    "providerId": "browser:ext:uniqueextensionid",
    "description": "Connect via a browser extension wallet",
    "icon": "https://example.com/favicon.svg",
    "installUrls": [
        {
            "platform": "chrome",
            "url": "https://chromewebstore.google.com/detail/..."
        }
    ]
}
```

| Field         | Description                                                                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | Display name in the picker                                                                                                                                  |
| `type`        | Provider type: `browser`, `desktop`, `mobile`, or `remote`                                                                                                  |
| `providerId`  | Must match the wallet's discovery id once installed (e.g. `browser:ext:<id>` for extensions, `remote:<rpcUrl>` for remote wallets)                          |
| `description` | Optional short description                                                                                                                                  |
| `icon`        | Optional icon URL                                                                                                                                           |
| `installUrls` | Setup or install links. For `browser` wallets, use `chrome` / `firefox` store URLs. For other types, link to download pages, app stores, or onboarding docs |

**Adding a wallet:** Wallet authors can open a PR that adds an entry to `wallets.json`. The
`providerId` must match how the wallet appears once available — for extensions, this is
typically what the wallet announces via `canton:announceProvider` (`browser:ext:<id>`).

**Disabling the verified list:** dApps that do not want the bundled list can opt out:

```typescript
await sdk.init({ enableSuggestedWallets: false })
```

### Default remote wallets (`gateways.json`)

Remote wallets in `gateways.json` are registered automatically as `RemoteAdapter` instances
(see above). Use this file for verified remote wallets that should appear as connectable
picker entries out of the box, rather than as install/setup prompts.

## Add adapters

Use `additionalAdapters` to add wallets while keeping the default remote wallets.

### Add WalletConnect

```typescript
import * as sdk from '@canton-network/dapp-sdk'
import { WalletConnectAdapter } from '@canton-network/dapp-sdk'

const wc = WalletConnectAdapter.create({
    projectId: import.meta.env.VITE_WC_PROJECT_ID,
})

await sdk.init({ additionalAdapters: [wc] })
```

> [!WARNING]
> Treat your WalletConnect `projectId` as configuration, not a secret to hardcode. Inject it
> through an environment variable as shown above.

### Add a custom remote wallet

```typescript
import { RemoteAdapter } from '@canton-network/dapp-sdk'

await sdk.init({
    additionalAdapters: [
        new RemoteAdapter({
            name: 'My Remote Wallet',
            rpcUrl: 'https://my-wallet.example/api/v0/dapp',
        }),
    ],
})
```

### Add a custom extension adapter

```typescript
import { ExtensionAdapter } from '@canton-network/dapp-sdk'

await sdk.init({
    additionalAdapters: [
        new ExtensionAdapter({
            providerId: 'browser:ext:com.example.mywallet' as never,
            name: 'My Wallet',
            target: 'com.example.mywallet',
        }),
    ],
})
```

## Replace the default remote wallets

To offer only specific remote wallets (and not the SDK defaults), pass `defaultAdapters`.

```typescript
import { RemoteAdapter } from '@canton-network/dapp-sdk'

await sdk.init({
    defaultAdapters: [
        new RemoteAdapter({
            name: 'Production Wallet',
            rpcUrl: 'https://wallet.example/api/v0/dapp',
        }),
    ],
})
```

## Register no remote wallets

Pass an empty list to explicitly choose "none". This is useful if your dApp only supports
announced extension wallets, or only adapters you add yourself.

```typescript
await sdk.init({ defaultAdapters: [] })
```

## Restrict to approved wallets

Combining `defaultAdapters` with a fixed list lets you constrain the picker to a set of
remote wallets you have vetted, which is a common production requirement.

```typescript
await sdk.init({
    defaultAdapters: [
        new RemoteAdapter({
            name: 'Approved Wallet',
            rpcUrl: 'https://approved.example/api/v0/dapp',
        }),
    ],
})
```

## Next steps

- [Wallet Providers](../wallet-providers/integration-overview.md) — How wallets make themselves discoverable.
- [Adapters Reference](../reference/sdk-methods.md) — Adapter constructors and options.
