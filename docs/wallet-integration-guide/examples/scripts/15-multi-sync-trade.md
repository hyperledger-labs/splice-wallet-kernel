# Example 15: Multi-Synchronizer DvP Trade

## Overview

This example implements a Delivery vs Payment (DvP) flow across multiple
synchronizers. It demonstrates how to orchestrate a trade between Amulet
(on a global synchronizer) and a Token instrument (on a private
synchronizer) using the OTC Trading App.

## Prerequisites

### 1. Localnet Running with Multi-Sync Profile

Start localnet with the `--multi-sync` flag to enable a second (private)
synchronizer:

```bash
yarn start:localnet:multi-sync
```

### 2. Download Required DARs

This example requires two DAR files that are **not** included in the
default localnet release. They must be downloaded manually from the
[`token-standard-v2-upcoming`](https://github.com/hyperledger-labs/splice/tree/token-standard-v2-upcoming)
branch of the Splice repository and placed in your `.localnet/dars/`
directory.

#### `splice-token-test-trading-app-v2-1.0.0.dar`

The v2 trading app DAR contains `OTCTradeProposal` and `OTCTrade`
templates used to orchestrate the multi-synchronizer trade.

Download from:
https://github.com/hyperledger-labs/splice/blob/token-standard-v2-upcoming/daml/dars/splice-token-test-trading-app-v2-1.0.0.dar

```bash
curl -L "https://raw.githubusercontent.com/hyperledger-labs/splice/token-standard-v2-upcoming/daml/dars/splice-token-test-trading-app-v2-1.0.0.dar" \
  -o .localnet/dars/splice-token-test-trading-app-v2-1.0.0.dar
```

#### `splice-test-token-v1-1.0.0.dar`

The test token DAR provides a simple token instrument used as the second
leg of the DvP trade (the instrument on the private synchronizer).

Download from:
https://github.com/hyperledger-labs/splice/blob/token-standard-v2-upcoming/daml/dars/splice-test-token-v1-1.0.0.dar

```bash
curl -L "https://raw.githubusercontent.com/hyperledger-labs/splice/token-standard-v2-upcoming/daml/dars/splice-test-token-v1-1.0.0.dar" \
  -o .localnet/dars/splice-test-token-v1-1.0.0.dar
```

### Quick Setup (both DARs at once)

From the repository root:

```bash
curl -L "https://raw.githubusercontent.com/hyperledger-labs/splice/token-standard-v2-upcoming/daml/dars/splice-token-test-trading-app-v2-1.0.0.dar" \
  -o .localnet/dars/splice-token-test-trading-app-v2-1.0.0.dar && \
curl -L "https://raw.githubusercontent.com/hyperledger-labs/splice/token-standard-v2-upcoming/daml/dars/splice-test-token-v1-1.0.0.dar" \
  -o .localnet/dars/splice-test-token-v1-1.0.0.dar
```

> **Note:** These DARs are from a feature branch and are not yet part of
> an official Splice release. They will be overwritten if you re-run
> `yarn script:fetch:localnet`, so you will need to re-download them
> after each localnet fetch.

## Running

```bash
yarn script:test:examples -- --filter 15
```

## How it Works

The script performs the following steps:

1. **Upload DARs** — Reads `splice-token-test-trading-app-v2-1.0.0.dar`
   and `splice-test-token-v1-1.0.0.dar` from `.localnet/dars/` and
   uploads them to the participant via the Ledger API.
2. **Discover synchronizers** — Finds the global and private
   synchronizers.
3. **Allocate parties** — Creates Alice, Bob, and the Trading App party.
4. **Mint holdings** — Mints Amulet for Alice (global sync) and Token
   for Bob (private sync).
5. **Create trade** — Trading App creates an `OTCTradeProposal`.
6. **Approve trade** — Both Alice and Bob accept the proposal.
7. **Initiate settlement** — Trading App initiates settlement, creating
   `OTCTrade` and `AllocationRequest` contracts.
8. **Allocate** — Alice allocates Amulet (global sync), Bob allocates
   Token (private sync).
9. **Reassign** — Bob's Token allocation is reassigned from private →
   global synchronizer.
10. **Settle** — Trading App exercises `OTCTrade_Settle`, transferring
    holdings.
11. **Post-settlement reassign** — Alice's new Token holding is
    reassigned from global → private synchronizer.
