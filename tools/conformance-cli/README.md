# CIP-103 Conformance CLI

Runs the CIP-103 conformance suite against a wallet and exports a CTRF report, optionally signed.
Test cases live in the [conformance dApp](../conformance-dapp/README.md); hooks for automating wallet
approvals live in
[`@canton-network/core-provider-conformance`](../../core/provider-conformance/README.md).

## Quick Start

Requires Node 26 or newer.

```sh
npm install @canton-network/tool-conformance-cli
npx conformance-cli serve
```

Open the printed URL (default `http://127.0.0.1:8082`), choose a provider and
wrapper, and select **Run suite**. By default you'll have to perform each
requested action in your wallet, then select **Action completed**. Download the
report when the run finishes.

Use disposable test wallets and credentials. Approving the transaction case
creates a real Ping contract, so the ledger must have
`#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping` available.

## Headless / CI

```sh
npx playwright install chromium
npx conformance-cli run --config conformance.config.json
```

Failed or incomplete runs exit with code 1. See `npx conformance-cli --help` for
all commands (`serve`, `run`, `sign`, `verify`).

## Configuration

All commands read an optional JSON config file passed via `--config`, with one
section per command. Relative paths resolve from the config file's directory.
The `run.suite` section uses the same format as the browser app's configuration
editor; see `ConfigSchema` in
[`src/config.ts`](../conformance-dapp/src/config.ts) for all options.

```json
{
    "run": {
        "suite": {
            "provider": {
                "type": "remote",
                "url": "http://localhost:3030/api/v0/dapp"
            },
            "wrapper": { "type": "manual" },
            "disabledTests": []
        },
        "headed": true,
        "out": "./result.json",
        "signingKey": "./tester.pem"
    }
}
```

- `provider.type`: `picker` (interactive SDK wallet picker), `remote` (`url`),
  or `extension` (`target`). Use `remote` or `extension` for unattended runs.
- `wrapper.type`: `manual` (requires `run.headed: true`), `window`, or
  `webhook` (`url`). See
  [core-provider-conformance](../../core/provider-conformance/README.md) for how
  a wallet answers `window`/`webhook` interactions.
- `run.extension`: path to an unpacked extension to load.

## Signed Reports

Reports can be signed with an Ed25519 key file (`run.signingKey` or the `sign`
command) or with a wallet (**Sign with wallet** in the UI), and checked with
`verify`. Signatures are detached: the report is never modified, and a separate
`<report>.sig` JSON file carries the algorithm, the SHA-256 digest of the report
file, the signature over that hex digest string, and optional signer metadata.

Reports downloaded with diagnostics are not covered by the signature and may
contain sensitive data.

## Development

See [`docs/CONTRIBUTING.md`](../../docs/CONTRIBUTING.md) for environment setup.

```sh
pnpm exec nx run @canton-network/tool-conformance-cli:build
pnpm exec nx run @canton-network/tool-conformance-cli:test
```
