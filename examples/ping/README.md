# Ping — Example dApp

A minimal dApp demonstrating the core [`@canton-network/dapp-sdk`](https://www.npmjs.com/package/@canton-network/dapp-sdk) integration. Built with React + TypeScript + Vite, this is the best starting point for understanding how a dApp connects to a Wallet Gateway and interacts with the Canton Network.

## What It Shows

- Connecting to and disconnecting from a Wallet Gateway
- Listing user accounts (Canton parties)
- Querying the Canton JSON Ledger API
- Submitting Daml commands (create / exercise)
- Subscribing to real-time events (status changes, account changes, window messages)

## Prerequisites

- See [`docs/CONTRIBUTING.md`](../../docs/CONTRIBUTING.md) for development environment setup.
- A running [Wallet Gateway](../../docs/wallet-gateway/quickstart.mdx) (default: `http://localhost:3030`)

## Running

First, install and build dependencies from the repository root:

```bash
pnpm install
pnpm build:all
```

Then start the dev server from this directory:

```bash
cd examples/ping
pnpm dev
```

Or from the repository root:

```bash
pnpm --filter @canton-network/example-ping dev
```

The app will be available at [http://localhost:8080](http://localhost:8080).

Alternatively, start all services (Wallet Gateway + example dApps) together from the repository root:

```bash
pnpm start:all     # starts everything via pm2
pnpm stop:all      # stops everything
```

## Further Reading

See the [dApp Building Guide](../../docs/dapp-building) for full documentation on the dApp SDK, Wallet Gateway configuration, APIs, and signing providers.
