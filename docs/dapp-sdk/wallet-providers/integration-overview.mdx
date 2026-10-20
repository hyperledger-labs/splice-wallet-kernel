---
title: 'Integration Overview'
description: 'How wallet providers make themselves discoverable to Canton dApps.'
---

This section is for **wallet authors** who want their wallet to be
[CIP-103](https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md)
compatible, so it can interoperate with Canton dApps and be listed in the wallet picker the
dApp SDK opens on `connect()`. Choose one or more of the integration paths below.

## Choose your integration

| How your wallet connects    | Approach                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Browser extension           | [Browser extension](browser-extension.md): announce with `canton:announceProvider`, and an optional `target` for `postMessage` |
| Remote (server-side) wallet | [Remote wallet](remote-wallet.md): expose a public CIP-103 RPC URL                                                             |
| Mobile / QR wallet          | [WalletConnect](walletconnect.md) via `additionalAdapters`                                                                     |

## What every wallet must provide

Regardless of path, a conforming wallet must:

- Implement the CIP-103 request methods (`connect`, `status`, `listAccounts`,
  `getPrimaryAccount`, `signMessage`, `prepareExecute`, `ledgerApi`, ...).
- Emit the CIP-103 events (`statusChanged`, `accountsChanged`, `txChanged`).
- Remain solely responsible for authorization and signing.
- Present clear approval UI before signing or executing.

See the [CIP-103 specification](https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md)
for the full protocol.

## Get listed in the SDK

Once your wallet is CIP-103 compliant, submit a pull request to the appropriate bundled list:

| Goal                                                                            | File                                                                                                 |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Appear as a **Suggested Wallet** (install / setup prompt when not yet detected) | [`wallets.json`](https://github.com/canton-network/wallet/blob/main/sdk/dapp-sdk/src/wallets.json)   |
| Appear as a connectable **remote** wallet by default                            | [`gateways.json`](https://github.com/canton-network/wallet/blob/main/sdk/dapp-sdk/src/gateways.json) |

The `providerId` must match how the wallet appears once available. For dApp-side options,
see [Wallet discovery](../guides/wallet-discovery.md#verified-wallets).

## Next steps

- [Browser Extension](browser-extension.md) — Announce a provider from an extension.
- [CIP-103 Specification](https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md) — The full protocol your wallet must implement.
