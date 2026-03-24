## What I added

- New package: `tools/wallet-gateway-remote-perf`
    - `package.json`
    - `tsconfig.json`
    - `tsup.config.ts`
    - `README.md`
    - `config/thresholds.json`
    - `src/main.ts`
    - `src/config.ts`
    - `src/rpc.ts`
    - `src/types.ts`
    - `src/k6-shims.d.ts`
    - `src/endpoints/system.ts`
    - `src/endpoints/user-api.ts`
    - `src/endpoints/dapp-api.ts`

- Workspace wiring:
    - Root `package.json` now includes `tools/**` in `workspaces`
    - `yarn.lock` contains the new workspace package entry

## Behavior

- k6 scenarios via env:
    - `SCENARIO=smoke|load|stress`
- Supports local and staging via env:
    - `BASE_URL`, `USER_PATH`, `DAPP_PATH`, `ACCESS_TOKEN`, `NETWORK_ID`
- Endpoint coverage grouped by:
    - `system` (`/healthz`, `/readyz`, well-known endpoints)
    - `userApi` (JSON-RPC methods)
    - `dappApi` (JSON-RPC methods)
- Per-request tagging for metrics:
    - `endpoint`, `endpoint_group`, `protocol`
- Threshold handling:
    - built-in defaults
    - optional override with `THRESHOLDS_FILE`
- Optional summary output:
    - `SUMMARY_JSON=<path>`

## Validation status

- `yarn nx run @canton-network/tools-wallet-gateway-remote-perf:build` passed
- `yarn nx run @canton-network/tools-wallet-gateway-remote-perf:typecheck` passed
- `yarn nx run @canton-network/tools-wallet-gateway-remote-perf:lint` blocked by repo/toolchain issue (`eslint` runtime formatter error: `util.styleText is not a function`)
- Runtime k6 execution was not validated in this environment because `k6` binary is not installed (`k6 version` fails)

## Quick run commands

```bash
# Build
yarn nx run @canton-network/tools-wallet-gateway-remote-perf:build

# Smoke
BASE_URL=http://localhost:3001 ACCESS_TOKEN=<jwt> \
yarn workspace @canton-network/tools-wallet-gateway-remote-perf perf:smoke

# Threshold-enforced
BASE_URL=http://localhost:3001 ACCESS_TOKEN=<jwt> \
THRESHOLDS_FILE=tools/wallet-gateway-remote-perf/config/thresholds.json \
yarn workspace @canton-network/tools-wallet-gateway-remote-perf perf:thresholds
```
