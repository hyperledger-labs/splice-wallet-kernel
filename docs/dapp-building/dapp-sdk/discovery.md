# Discovery & adapter registration

Adapters you register in `init()` determine what the SDK can discover and what the
user will see in the **wallet picker** opened by `connect()`. In other words:

- If an adapter is registered (and passes `detect()`), it can show up as an entry in the picker.
- Session restore can only happen for adapters that are registered.

## Option 1: Use the built-in default gateways

This registers the SDK’s default gateway list (from `gateways.json`) plus any injected / announced wallets:

```typescript
await sdk.init()
```

## Option 2: Add adapters (recommended)

Use `additionalAdapters` to add extra wallets (custom remote gateways, WalletConnect, etc.) while keeping
the default gateways.

### Add WalletConnect

```typescript
import { WalletConnectAdapter } from '@canton-network/dapp-sdk'

const wc = WalletConnectAdapter.create({
    projectId: import.meta.env.VITE_WC_PROJECT_ID,
})

await sdk.init({ additionalAdapters: [wc] })
```

### Add a custom remote wallet gateway URL

```typescript
import { RemoteAdapter } from '@canton-network/dapp-sdk'

await sdk.init({
    additionalAdapters: [
        new RemoteAdapter({
            name: 'My Gateway',
            rpcUrl: 'https://my-gateway.example/api/v0/dapp',
        }),
    ],
})
```

### Add a custom extension adapter (postMessage target)

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

## Option 3: Replace the default gateways

If you want to _only_ offer specific remote gateways (and not the SDK defaults), provide `defaultAdapters`.

```typescript
import { RemoteAdapter } from '@canton-network/dapp-sdk'

await sdk.init({
    defaultAdapters: [
        new RemoteAdapter({
            name: 'Production Gateway',
            rpcUrl: 'https://gateway.example/api/v0/dapp',
        }),
    ],
})
```

## Option 4: Intentionally register no remote gateways

If you pass an empty list, you are explicitly choosing “none” (useful if your dApp only supports
injected/announced wallets, or only supports adapters you add later).

```typescript
await sdk.init({ defaultAdapters: [] })
```
