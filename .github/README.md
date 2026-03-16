# CI Test Run Matrix

This document summarizes when each test job in `.github/workflows/build.yml` runs.

## Pull Request Trigger

The CI workflow runs on pull request events:

- `opened`
- `reopened`
- `synchronize`
- `edited`

## Test Run Matrix

| Job                   | Type                                | Runs on PR event (`opened/reopened/synchronize/edited`) | Extra condition                                                            | What it runs                                                                           |
| --------------------- | ----------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `test-static`         | Static checks                       | Always                                                  | None                                                                       | commitlint title, package checks, typecheck, OpenRPC title check, prettier, eslint     |
| `test-unit`           | Unit/integration (Nx target `test`) | Always                                                  | `needs: build`                                                             | `yarn nx affected -t test --base=origin/${{ github.base_ref }} --head=HEAD --parallel` |
| `test-kernel-e2e`     | E2E (ping app)                      | Always                                                  | `needs: build`                                                             | starts Canton+services and runs Playwright for `@canton-network/example-ping`          |
| `test-portfolio-e2e`  | E2E (portfolio app)                 | Always                                                  | `needs: build`                                                             | starts Canton+services and runs Playwright for `@canton-network/example-portfolio`     |
| `wallet-sdk-affected` | Gate/check job                      | Always                                                  | None                                                                       | computes `run_wallet_sdk_tests` and `matched_projects` outputs                         |
| `sdk-e2e`             | Wallet SDK E2E (slow)               | Conditional                                             | `needs: [build, wallet-sdk-affected]` and `run_wallet_sdk_tests == 'true'` | snippet + example script tests on matrix `devnet` + `mainnet`                          |
| `test-wallet-sdk-e2e` | Aggregator/reporting                | Always                                                  | `needs: [wallet-sdk-affected, sdk-e2e]`, `if: always()`                    | passes when intentionally skipped; fails if sdk-e2e was required but did not succeed   |
| `test-wallet-sdk-pkg` | SDK package validation              | Always                                                  | `needs: build`                                                             | `yarn script:validate:package`                                                         |

## `sdk-e2e` Trigger Rules

`sdk-e2e` runs when either condition is true:

- Nx marks `@canton-network/wallet-sdk` as affected (including dependency-impact via project graph).
- `docs-wallet-integration-guide-examples` is affected.
