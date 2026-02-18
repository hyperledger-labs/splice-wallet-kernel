# dApp SDK

**`@canton-network/dapp-sdk`** — TypeScript SDK for building decentralized applications on the [Canton Network](https://www.canton.network/). Connect users to Canton wallets, manage accounts, sign messages, and execute transactions — all through a vendor-neutral interface defined by [CIP-0103](https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md).

> [!IMPORTANT]
> This project is under active development and may introduce breaking changes until version 1.0.0. Migration guides for each release are published in [Discussions](https://github.com/hyperledger-labs/splice-wallet-kernel/discussions).

## Features

- **Wallet Connectivity** — Connect, disconnect, and monitor connection status
- **Account Management** — List accounts, get the primary account, and respond to account changes
- **Transaction Signing** — Request user approval and signatures for Daml transactions
- **Message Signing** — Sign arbitrary messages for authentication or verification
- **Ledger API Access** — Proxy authenticated requests to the Canton JSON Ledger API
- **Real-time Events** — Subscribe to status changes, account changes, and transaction lifecycle events
- **Multi-transport** — HTTP/SSE for remote Wallet Gateways, `postMessage` for browser extension wallets
- **EIP-1193 Provider** — Familiar `window.canton` provider interface following Ethereum conventions

## Installation

```shell
npm install @canton-network/dapp-sdk
```

```shell
yarn add @canton-network/dapp-sdk
```

```shell
pnpm add @canton-network/dapp-sdk
```

## Quick Start

```typescript
import * as sdk from '@canton-network/dapp-sdk'

// Connect to the user's wallet
const result = await sdk.connect()
console.log(result.isConnected)

// List the user's accounts (parties)
const accounts = await sdk.listAccounts()
const primary = accounts.find((a) => a.primary)

// Execute a transaction
await sdk.prepareExecute({
    commands: [
        {
            CreateCommand: {
                templateId: '#MyApp:MyModule:MyTemplate',
                createArguments: { owner: primary.partyId },
            },
        },
    ],
})

// Listen for real-time updates
sdk.onTxChanged((tx) => {
    console.log('Transaction status:', tx.status)
})
```

### Provider API

For lower-level control, the SDK also exposes an [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193)-compatible provider:

```typescript
const provider = window.canton

const result = await provider.request<ConnectResult>({ method: 'connect' })
const accounts = await provider.request<Account[]>({ method: 'listAccounts' })

provider.on('accountsChanged', (accounts) => {
    console.log('Accounts changed:', accounts)
})
```

## Documentation

Full documentation, including detailed usage guides, API reference, and configuration for the Wallet Gateway:

- [dApp Building Guide](https://github.com/hyperledger-labs/splice-wallet-kernel/tree/main/docs/dapp-building)
- [dApp SDK Documentation](https://github.com/hyperledger-labs/splice-wallet-kernel/tree/main/docs/dapp-building/dapp-sdk)
- [API Specifications (OpenRPC)](https://github.com/hyperledger-labs/splice-wallet-kernel/tree/main/api-specs)
- [Example dApps](https://github.com/hyperledger-labs/splice-wallet-kernel/tree/main/examples)

## License

[Apache-2.0](https://github.com/hyperledger-labs/splice-wallet-kernel/blob/main/LICENSE)
