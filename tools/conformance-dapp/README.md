# CIP-103 Conformance dApp

Browser UI and SDK-facing test suite for CIP-103 wallet conformance. To run it
against a wallet, use the [conformance CLI](../conformance-cli/README.md), which
bundles and serves this app.

## Test Cases

Test cases live in [`src/tests/`](src/tests/), one file per category (connect,
status, accounts, network, request handling, sign message, prepare & execute,
disconnect). [`src/tests/index.ts`](src/tests/index.ts) registers them in
execution order. Each case has a stable id (e.g. `connect.approve`) that can be
listed in `disabledTests` to skip it.

## Custom Harnesses

The CLI drives this app through Playwright using the `data-testid` attributes on
its controls. Custom harnesses can do the same, so keep those ids stable when
changing the UI.

## Development

```sh
pnpm exec nx run @canton-network/tool-conformance-dapp:build
pnpm --filter @canton-network/tool-conformance-dapp dev
pnpm nx test @canton-network/tool-conformance-dapp
```

Browser and CLI integration tests live in
[`tools/conformance-cli`](../conformance-cli/).
