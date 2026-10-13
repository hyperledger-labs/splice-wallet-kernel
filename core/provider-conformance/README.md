# Conformance Test Provider

`@canton-network/core-provider-conformance` provides the contracts and wrappers
used by the [conformance CLI](../../tools/conformance-cli/README.md) to automate
wallet approvals and rejections during a CIP-103 conformance run. See
[`src/test-provider.ts`](src/test-provider.ts) for the full API.

```sh
pnpm add @canton-network/core-provider-conformance
```

## Test Hooks

`TestProvider` extends the SDK provider with six hooks, each approving or
rejecting a request that is already pending in the wallet:

- `test_approveConnect` / `test_rejectConnect`
- `test_approveSignMessage` / `test_rejectSignMessage`
- `test_approvePrepareExecute` / `test_rejectPrepareExecute`

Hooks only perform the user action; the wallet's own RPC response remains the
result under test.

## Automating a Wallet

The suite discovers the wallet under test like any production wallet (`remote`
or `extension`) and drives decisions through a wrapper selected in the suite
config:

- `manual`: the tester performs the action and confirms in the dApp.
- `window`: the dApp dispatches a `cip103:test:interaction` event on `window`.
- `webhook`: the dApp POSTs the interaction as JSON to the configured `url`
  (which must allow CORS).

The interaction has the shape `{ id, method, decision, params }`. After
performing the action in the wallet, reply with `{ id, completed: true }`, or
`{ id, error: "description" }` if the action could not be performed — as a
`cip103:test:ack` window event, or as the HTTP 2xx response body for webhooks.
Payloads may contain sensitive transaction data; use test data only.

## Development

```sh
pnpm --filter @canton-network/core-provider-conformance build
pnpm nx test @canton-network/core-provider-conformance
```
