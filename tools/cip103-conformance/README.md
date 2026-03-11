# CIP-103 Conformance CLI

Self-serve conformance checks for wallet providers against CIP-103 sync/async profiles.
The CLI is built with `commander` and provides strict option validation.

## Installation

Install the CLI globally (or run it with your preferred package runner):

```bash
npm install -g @canton-network/cip103-conformance
```

The package bundles the required OpenRPC specs internally, so users do not need a local `api-specs` folder.

## Commands

### `run`

Runs the conformance suite against a provider and writes a result artifact JSON.

```bash
conformance-cli run --profile sync|async --provider-config <file> [--out <file>] [--signing-key <pem>] [--key-id <id>]
```

- required:
    - `--profile`: `sync` or `async`
    - `--provider-config`: path to provider config JSON
- optional:
    - `--out`: artifact output path (default: `dist/conformance/result.json`)
    - `--signing-key`: Ed25519 private key PEM to sign artifact
    - `--key-id`: key identifier embedded in `artifact.signature.keyId` (requires `--signing-key`)

Example:

```bash
conformance-cli run --profile async --provider-config provider.config.remote.example.json --out dist/conformance/remote-result.json
```

### `validate-artifact`

Validates artifact schema, and optionally validates signature.

```bash
conformance-cli validate-artifact --artifact <file> [--public-key <pem>] [--require-signature]
```

- required:
    - `--artifact`: path to generated result artifact
- optional:
    - `--public-key`: Ed25519 public key PEM for signature verification
    - `--require-signature`: fail if artifact is unsigned

Examples:

```bash
conformance-cli validate-artifact --artifact dist/conformance/remote-result.json
conformance-cli validate-artifact --artifact dist/conformance/remote-result.json --public-key ./keys/provider.pub.pem --require-signature
```

### `export-badge`

Generates badge JSON (`pass`/`fail`) from an artifact.

```bash
conformance-cli export-badge --artifact <file> [--out <file>]
```

- required:
    - `--artifact`: path to generated result artifact
- optional:
    - `--out`: badge output path (default: `dist/conformance/badge.json`)

Example:

```bash
conformance-cli export-badge --artifact dist/conformance/remote-result.json --out dist/conformance/remote-badge.json
```

## Example Provider Config

```json
{
    "name": "Example Wallet Provider",
    "version": "1.2.3",
    "endpoint": "http://localhost:8081/json-rpc",
    "timeoutMs": 10000
}
```

## Example Provider Config (Server-Side Wallet)

Use this for remote wallet gateways or any server-hosted JSON-RPC provider.
In many setups, an Authorization header is required.

```json
{
    "name": "Example Server-Side Wallet",
    "version": "1.2.3",
    "endpoint": "https://wallet.example.com/api/v0/dapp",
    "timeoutMs": 15000,
    "headers": {
        "authorization": "Bearer <access-token>"
    }
}
```

See `provider.config.remote.example.json` for a copy-ready template.

## Example Provider Config (Browser Extension Wallet)

Current implementation note: the conformance runner executes JSON-RPC over HTTP.
For browser extension wallets, use a local bridge endpoint that exposes the extension methods over JSON-RPC.

```json
{
    "name": "Example Browser Extension Wallet",
    "version": "1.0.0",
    "endpoint": "http://127.0.0.1:12481/json-rpc",
    "timeoutMs": 10000,
    "headers": {
        "x-provider-kind": "browser-extension"
    },
    "extensionId": "abcdefghijklmnoabcdefghijklmn",
    "injectedNamespace": "window.canton"
}
```

See `provider.config.browser-extension.example.json` for a copy-ready template.

## Profile Mapping

- `sync` -> `api-specs/openrpc-dapp-api.json`
- `async` -> `api-specs/openrpc-dapp-remote-api.json`
