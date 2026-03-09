# CIP-103 Conformance CLI

Self-serve conformance checks for wallet providers against CIP-103 sync/async profiles.
The CLI is built with `commander` and provides strict option validation.

## Commands

- `conformance-cli run --profile sync|async --provider-config <file>`
- `conformance-cli validate-artifact --artifact <file> [--public-key <pem>] [--require-signature]`
- `conformance-cli export-badge --artifact <file> [--out <file>]`

## Example Provider Config

```json
{
    "name": "Example Wallet Provider",
    "version": "1.2.3",
    "endpoint": "http://localhost:8081/json-rpc",
    "timeoutMs": 10000
}
```

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
