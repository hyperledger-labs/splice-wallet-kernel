# Wallet SDK

This package provides a TypeScript SDK for interacting with the Canton Network, with the aim of making wallet integrations easy. Currently the SDK only supports NodeJS environments.

## Features

- Authenticate & connect to a synchronizer
- Allocate parties with an external keypair
- Read active contracts on the ledger
- Decode and validate prepared transactions
- Sign and submit transactions

## Installation

Install the SDK with your package manager of choice

```shell
$ npm install @canton-network/wallet-sdk
```

or

```shell
$ yarn add @canton-network/wallet-sdk
```

## Getting Started

Import and configure the SDK:

```ts
import {
    localAuthDefault,
    localLedgerDefault,
    localTopologyDefault,
    localTokenStandardDefault,
    WalletSDKImpl,
} from '@canton-network/wallet-sdk'

const sdk = new WalletSDKImpl().configure({
    logger: console,
    authFactory: localAuthDefault,
    ledgerFactory: localLedgerDefault,
    topologyFactory: localTopologyDefault,
    tokenStandardFactory: localTokenStandardDefault,
})

logger.info('SDK initialized')

await sdk.connect()
```

For more guides, examples and code snippets, see the [docs](https://docs.digitalasset.com/integrate/devnet/index.html).
