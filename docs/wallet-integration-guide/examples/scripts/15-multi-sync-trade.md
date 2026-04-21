# Example 15: Multi-Synchronizer DvP Trade

## Overview

This example implements a Delivery vs Payment (DvP) flow across multiple
synchronizers. It demonstrates how to orchestrate a trade between Amulet
(on a global synchronizer) and a Token instrument (on a private/app
synchronizer) using the OTC Trading App.

Complete workflow covered:

- SDK initialization with multiple synchronizers
- Party allocation and registration across synchronizers
- Parallel asset minting (Amulet on global, Token on private)
- Multi-synchronizer trade settlement with multi-party signing
- Cross-synchronizer contract reassignment

## Prerequisites

### 1. Download the localnet bundle (first time only)

If you have never run localnet before, or after a Splice version update:

```bash
yarn script:fetch:localnet
```

For mainnet network variant:

```bash
yarn script:fetch:localnet -- --network=mainnet
```

This populates `.localnet/docker-compose/` and `.localnet/dars/`.

### 2. Download the Example 15 DARs

These two DARs are **not** included in the standard localnet bundle.
They come from the
[`token-standard-v2-upcoming`](https://github.com/hyperledger-labs/splice/tree/token-standard-v2-upcoming)
branch and must be downloaded separately.

**Automated (recommended):**

```bash
yarn script:setup:example-15
```

**Manual:**

```bash
mkdir -p .localnet/dars

curl -L "https://raw.githubusercontent.com/hyperledger-labs/splice/token-standard-v2-upcoming/daml/dars/splice-token-test-trading-app-v2-1.0.0.dar" \
  -o .localnet/dars/splice-token-test-trading-app-v2-1.0.0.dar

curl -L "https://raw.githubusercontent.com/hyperledger-labs/splice/token-standard-v2-upcoming/daml/dars/splice-test-token-v1-1.0.0.dar" \
  -o .localnet/dars/splice-test-token-v1-1.0.0.dar
```

> **Important:** `yarn script:fetch:localnet` overwrites `.localnet/dars/`,
> so you must re-run `yarn script:setup:example-15` after every localnet fetch.

The two files placed in `.localnet/dars/`:

| DAR file                                     | Purpose                                                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `splice-token-test-trading-app-v2-1.0.0.dar` | `OTCTrade` and `OTCTradeAllocationRequest` templates for orchestrating the trade   |
| `splice-test-token-v1-1.0.0.dar`             | `Token` and `TokenRules` templates — the custom instrument on the app-synchronizer |

## Running Locally

All commands are run from the **repository root**.

### Step-by-step

```bash
# Step 1: Fetch localnet (first time / after version update)
yarn script:fetch:localnet

# Step 2: Download the required DARs
yarn script:setup:example-15

# Step 3: Start localnet
#   The multi-sync profile (global + app-synchronizer) is always active.
#   No special flag is needed.
yarn start:localnet

# Step 4: Wait until all containers are healthy
docker ps --format "table {{.Names}}\t{{.Status}}"
# All services should show "(healthy)" before proceeding.

# Step 5: Run the example
yarn example:run-15
```

### One-liner (when localnet is already running)

```bash
yarn script:setup:example-15 && yarn example:run-15
```

### As part of the full example test suite

```bash
# Ensure DARs are downloaded first
yarn script:setup:example-15

# Then run all examples (example 15 is included automatically)
yarn script:test:examples
```

If the DARs are missing, example 15 will fail immediately with:
`Required DAR not found — Run: yarn script:setup:example-15`

### Expected output

```
[v1-15-multi-sync-trade] Connected synchronizers: global, app-synchronizer
[v1-15-multi-sync-trade] All required DARs uploaded successfully
[v1-15-multi-sync-trade] All DARs vetted on app-synchronizer
[v1-15-multi-sync-trade] Parties allocated — alice: ..., bob: ..., tradingApp: ...
[v1-15-multi-sync-trade] alice: registered on app-synchronizer
[v1-15-multi-sync-trade] bob: registered on app-synchronizer
[v1-15-multi-sync-trade] tradingApp: registered on app-synchronizer
[v1-15-multi-sync-trade] Alice: Amulet holding minted (2,000,000)
[v1-15-multi-sync-trade] TokenRules created by Bob (on app-synchronizer)
[v1-15-multi-sync-trade] Bob: Token holding minted (500 TestToken, on app-synchronizer)
[v1-15-multi-sync-trade] OTCTrade created by Trading App
[v1-15-multi-sync-trade] Trading App: Allocation requests created
[v1-15-multi-sync-trade] Alice: Amulet allocation created for leg-0
[v1-15-multi-sync-trade] Bob: TestToken allocation created for leg-1 (on app-synchronizer)
[v1-15-multi-sync-trade] Trading App: OTCTrade settled
[v1-15-multi-sync-trade] Alice: TestToken self-transferred on app-synchronizer
[v1-15-multi-sync-trade] Final contract state after step 12 (Transfer): ...
```

## How it Works

| Step | Who         | What                                     | Synchronizer                                          |
| ---- | ----------- | ---------------------------------------- | ----------------------------------------------------- |
| 1    | —           | Upload DARs to ledger                    | global                                                |
| 2    | —           | Vet DARs on app-synchronizer             | app                                                   |
| 3    | —           | Create parties (Alice, Bob, Trading App) | global                                                |
| 4    | —           | Register all parties on app-synchronizer | app                                                   |
| 5    | SDK         | Mint 2,000,000 Amulet for Alice          | global                                                |
| 6    | Bob         | Create `TokenRules` contract             | app                                                   |
| 7    | Bob         | Mint 500 `TestToken` holding             | app                                                   |
| 8    | Trading App | Create `OTCTrade` (2 legs)               | global                                                |
| 9    | Trading App | `OTCTrade_RequestAllocations`            | global                                                |
| 10   | Alice       | `AllocationFactory_Allocate` (Amulet)    | global                                                |
| 11   | Bob         | `AllocationFactory_Allocate` (Token)     | app                                                   |
| 12   | Trading App | `OTCTrade_Settle` (multi-party signing)  | global (Canton auto-reassigns Bob's Token allocation) |
| 13   | Alice       | `TransferFactory_Transfer` self-transfer | app (Canton auto-reassigns Alice's Token from global) |

## Troubleshooting

### `Required DAR not found`

Run the setup script:

```bash
yarn script:setup:example-15
```

Verify the files are present:

```bash
ls -la .localnet/dars/splice-token-test-trading-app-v2-1.0.0.dar \
        .localnet/dars/splice-test-token-v1-1.0.0.dar
```

### `App synchronizer not found (alias: app-synchronizer)`

This error means the `app-user` participant is not connected to the app-synchronizer.
The `scripts/localnet/app-synchronizer.sc` bootstrap script must connect **both**
`app-provider` and `app-user` to the app-synchronizer. Check that you are using
the current version of that file (it should reference both participants).

Check that the `multi-sync-startup` bootstrap container ran to completion:

```bash
docker logs $(docker ps -a --filter name=multi-sync-startup --format "{{.ID}}")
```

The last line should read:

```
app-synchronizer bootstrap with package vetting completed successfully for app-provider and app-user
```

If localnet was started with an older version of the bootstrap script, restart it:

```bash
yarn stop:localnet
yarn start:localnet
```

### `No connected synchronizers found`

Localnet may still be initialising. Wait until all containers show `(healthy)`:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Docker containers not starting

Ensure Docker Desktop has enough resources (≥ 8 GB RAM, ≥ 4 CPUs recommended).
Check current usage:

```bash
docker stats --no-stream
```
