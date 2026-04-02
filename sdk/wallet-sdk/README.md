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
import { SDK } from '@canton-network/wallet-sdk'

const auth: TokenProviderConfig = {
    method: 'self_signed',
    issuer: 'unsafe-auth',
    credentials: {
        clientId: 'ledger-api-user',
        clientSecret: 'unsafe',
        audience: 'https://canton.network.global',
        scope: '',
    },
}

const sdk = await SDK.create({
    auth,
    ledgerClientUrl: 'http:ledgerClientHost:port',
})

//alternatively, if you have a Provider with LedgerApi capabilities

const sdk = await SDK.create(provider)
```

For more guides, examples and code snippets, see the [docs](https://docs.digitalasset.com/integrate/devnet/index.html).
