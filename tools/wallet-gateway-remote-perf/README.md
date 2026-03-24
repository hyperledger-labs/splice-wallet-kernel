# wallet-gateway-remote performance tool

k6-based load testing package for `wallet-gateway/remote`.

## What it tests

- System endpoints
    - `/healthz`
    - `/readyz`
    - `/.well-known/wallet-gateway-config`
    - `/.well-known/wallet-gateway-version`
- User API JSON-RPC endpoint (`/api/v0/user` by default)
- dApp API JSON-RPC endpoint (`/api/v0/dapp` by default)

The default test loop executes all registered endpoints in round-robin order and tags each request with:

- `endpoint`
- `endpoint_group` (`system`, `userApi`, `dappApi`)
- `protocol` (`jsonrpc` for API methods)

## Prerequisites

- k6 installed locally ([install docs](https://grafana.com/docs/k6/latest/set-up/install-k6/))
- wallet-gateway-remote running locally or a staging URL

## Build

```bash
yarn nx run @canton-network/tools-wallet-gateway-remote-perf:build
```

## Run examples

From repository root:

```bash
# local smoke
BASE_URL=http://localhost:3001 ACCESS_TOKEN=<jwt> yarn workspace @canton-network/tools-wallet-gateway-remote-perf perf:smoke

# staging load
BASE_URL=https://wallet-gateway.example.com ACCESS_TOKEN=<jwt> SCENARIO=load yarn workspace @canton-network/tools-wallet-gateway-remote-perf perf:load

# custom thresholds + summary artifact
BASE_URL=http://localhost:3001 \
ACCESS_TOKEN=<jwt> \
THRESHOLDS_FILE=tools/wallet-gateway-remote-perf/config/thresholds.json \
SUMMARY_JSON=tools/wallet-gateway-remote-perf/out/summary.json \
yarn workspace @canton-network/tools-wallet-gateway-remote-perf perf:thresholds
```

## Environment variables

- `BASE_URL` (default: `http://localhost:3001`)
- `USER_PATH` (default: `/api/v0/user`)
- `DAPP_PATH` (default: `/api/v0/dapp`)
- `ACCESS_TOKEN` (Bearer token for `/api/*` routes)
- `NETWORK_ID` (used for `addSession`, default `localnet`)
- `SCENARIO` (`smoke`, `load`, `stress`)
- `THRESHOLDS_FILE` (optional path to threshold config JSON)
- `SUMMARY_JSON` (optional output file path for k6 summary JSON)
- `RUN_ID` (optional trace id injected into request headers)
- `REQUEST_TIMEOUT` (k6 request timeout, default `30s`)
- `INCLUDE_MUTATING_USER_API=1` to include write-heavy user methods
- `INCLUDE_MUTATING_DAPP_API=1` to include write-heavy dApp methods

## CI usage pattern

- Non-gating trend collection:
    - run with relaxed thresholds and always upload `SUMMARY_JSON`.
- Gating profile:
    - run with stricter `THRESHOLDS_FILE`, fail job on threshold breach.
