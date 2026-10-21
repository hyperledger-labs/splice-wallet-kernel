# CI Test Run Matrix

This document summarizes when each test job in `.github/workflows/build.yml` runs.

## Pull Request Trigger

The CI workflow runs on pull request events:

- `opened`
- `reopened`
- `synchronize`
- `edited`

## Test Run Matrix

| Job                       | Type                                | Runs on PR event (`opened/reopened/synchronize/edited`) | Extra condition                                                                                   | What it runs                                                                   |
| ------------------------- | ----------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `test-static`             | Static checks                       | Always                                                  | `needs: build`                                                                                    | PR title, package checks, formatting, schema docs; affected typecheck and lint |
| `test-unit`               | Unit/integration (Nx target `test`) | Always; affected targets only                           | `needs: build`                                                                                    | Unit tests with coverage, then affected coverage summary                       |
| `build-docs`              | Documentation build                 | Always                                                  | `needs: build`                                                                                    | Sphinx documentation build                                                     |
| `hydrate-canton-caches`   | Infrastructure cache preparation    | Conditional: any e2e suite affected                     | `needs: build`                                                                                    | Required Canton/Localnet network caches                                        |
| `ping-e2e`                | E2E worker (ping app)               | Conditional: ping project affected                      | `needs: [build, hydrate-canton-caches]`                                                           | Canton and Playwright on devnet/mainnet, SQLite/Postgres                       |
| `test-ping-e2e`           | Aggregator/reporting                | Always                                                  | `needs: [build, ping-e2e]`, `if: always()`                                                        | Validates build and ping worker result                                         |
| `extension-e2e`           | E2E worker (browser extension)      | Conditional: extension project affected                 | `needs: [build, hydrate-canton-caches]`                                                           | Canton and extension Playwright tests on devnet                                |
| `test-extension-e2e`      | Aggregator/reporting                | Always                                                  | `needs: [build, extension-e2e]`, `if: always()`                                                   | Validates build and extension worker result                                    |
| `portfolio-e2e`           | E2E worker (portfolio app)          | Conditional: portfolio project affected                 | `needs: [build, hydrate-canton-caches]`                                                           | Localnet and Playwright on devnet/mainnet                                      |
| `test-portfolio-e2e`      | Aggregator/reporting                | Always                                                  | `needs: [build, portfolio-e2e]`, `if: always()`                                                   | Validates build and portfolio worker result                                    |
| `wallet-sdk-snippets-e2e` | Wallet SDK snippets E2E             | Conditional: guide examples project affected            | `needs: [build, hydrate-canton-caches]`                                                           | Snippet tests on devnet/mainnet Localnet                                       |
| `wallet-sdk-scripts-e2e`  | Wallet SDK scripts E2E              | Conditional: guide examples project affected            | `needs: [build, hydrate-canton-caches]`                                                           | Example scripts on devnet/mainnet Localnet                                     |
| `wallet-sdk-pkg`          | SDK package validation              | Always                                                  | `needs: build`                                                                                    | SDK package installation validation                                            |
| `test-wallet-sdk-e2e`     | Aggregator/reporting                | Always                                                  | `needs: [build, wallet-sdk-snippets-e2e, wallet-sdk-scripts-e2e, wallet-sdk-pkg]`, `if: always()` | Validates build, SDK workers and package validation                            |
| `test-migrations`         | SQL migration tests                 | Always; affected targets only                           | `needs: build`                                                                                    | SQL migration tests                                                            |
| `check-migration-lock`    | Migration immutability check        | Always; affected targets only                           | `needs: build`                                                                                    | Migration lock-file validation                                                 |

The workflow uses aggregator wrappers (`test-ping-e2e`, `test-extension-e2e`, `test-portfolio-e2e`, and `test-wallet-sdk-e2e`) that always run and validate the success of the corresponding worker jobs.

Edit the suite table in [e2e-setup.ts](../scripts/src/ci/e2e-setup.ts) to change network coverage. Only affected suites and their required infrastructure caches are prepared. Required reporting checks accept intentional skips but fail on build failures, test failures or unexpected skips.

## Selection

[`setup_versions`](./actions/setup_versions/action.yml) uses `affected: 'true'` for PR e2e selection and `'false'` for full setup. Nx tracks package dependencies, runtime dependencies and shared configuration through [nx.json](../nx.json).

Preview affected selection locally:

```sh
pnpm exec tsx scripts/src/ci/e2e-setup.ts --base=origin/main --head=HEAD
```

Omit both arguments to select all suites.
