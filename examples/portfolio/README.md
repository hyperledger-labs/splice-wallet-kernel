# Portfolio — dApp

A feature-rich dApp showcasing a wallet portfolio built with the [`@canton-network/dapp-sdk`](https://www.npmjs.com/package/@canton-network/dapp-sdk). Built with React + TypeScript + Vite + MUI + TanStack Router/Query.

## What It Shows

- Wallet connectivity and account management
- Viewing token holdings across multiple instruments
- Initiating and settling transfers between parties
- Allocation requests and settlement workflows
- Transaction history
- Network and registry validation
- Dark/light theme support

## Prerequisites

- Node.js 20+
- A running [Wallet Gateway](../../docs/dapp-building/wallet-gateway/getting-started/index.md) (default: `http://localhost:3030`)

## Running

First, install and build dependencies from the repository root:

```bash
yarn install
yarn build:all
```

Then start the dev server from this directory:

```bash
cd examples/portfolio
yarn dev
```

Or from the repository root:

```bash
yarn workspace @canton-network/example-portfolio dev
```

The app will be available at [http://localhost:8081](http://localhost:8081).

Alternatively, start all services (Wallet Gateway + example dApps) together from the repository root:

```bash
yarn start:all     # starts all services via pm2
yarn stop:all      # stops all services
```

## Further Reading

See the [dApp Building Guide](../../docs/dapp-building) for full documentation on the dApp SDK, Wallet Gateway configuration, APIs, and signing providers.
