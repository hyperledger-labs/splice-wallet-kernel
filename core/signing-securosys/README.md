# @canton-network/core-signing-securosys

Signing driver for integrating the Canton Wallet Gateway with Securosys TSB.

## Features

- `createKey` creates a TSB SKA key with a hardcoded empty policy, then
  renames it to a label derived from the public key.
- `getKeys` enumerates TSB keys and returns Wallet Gateway-compatible public
  keys.
- `signTransaction` creates a TSB sign request and returns the TSB request ID as
  the provider `txId`. See [Key identifiers](#key-identifiers) for how the
  signing key is resolved.
- `getTransaction` maps TSB request status/result into Wallet Gateway
  transaction status/signature fields.
- `getTransactions` fetches by provider transaction IDs. Public-key-only
  filtering is supported from this driver's in-memory transaction cache.
- Runtime configuration can be inspected and changed through
  `getConfiguration` / `setConfiguration`.

## Usage

```typescript
import SecurosysSigningDriver from '@canton-network/core-signing-securosys'

const driver = new SecurosysSigningDriver({
    baseUrl: 'http://localhost:8080',
    keyManagementApiKey: process.env.TSB_KEY_MANAGEMENT_API_KEY,
    keyOperationApiKey: process.env.TSB_KEY_OPERATION_API_KEY,
    mtlsP12Path: process.env.TSB_MTLS_P12_PATH,
    mtlsP12Password: process.env.TSB_MTLS_P12_PASSWORD,
})
```

The TSB endpoints used by the driver are:

- `GET /v1/key`
- `POST /v1/key`
- `POST /v1/key/attributes`
- `PATCH /v1/key/changeAttributes`
- `POST /v1/sign`
- `GET /v1/request/{id}`
- `POST /v1/filteredRequests`
- `DELETE /v1/request/{id}`

## Configuration

| Property              | Description                                                                                                                |
| :-------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| `baseUrl`             | Base URL of the TSB service.                                                                                               |
| `keyManagementApiKey` | `X-API-KEY` value for `/v1/key` endpoints.                                                                                 |
| `keyOperationApiKey`  | `X-API-KEY` value for signing/request-status endpoints.                                                                    |
| `bearerToken`         | Optional bearer access token for access-token mode.                                                                        |
| `mtlsP12Path`         | Optional path to a PKCS#12/P12 client certificate used when TSB requires mTLS.                                             |
| `mtlsP12Password`     | Optional password for the PKCS#12/P12 client certificate.                                                                  |
| `keyPassword`         | Optional TSB key password used for key attributes and signing.                                                             |
| `signatureAlgorithm`  | TSB signature algorithm. Defaults to `EDDSA`; current Wallet Gateway/Canton signing expects Ed25519-compatible signatures. |

When these values are changed through the Wallet Gateway configuration RPC, use
the existing PascalCase convention: `MtlsP12Path` and `MtlsP12Password`.
`MtlsP12Password` is masked in `getConfiguration`.

The remote Wallet Gateway reads the same values from these environment
variables:

| Environment variable                   | Driver property       |
| :------------------------------------- | :-------------------- |
| `SECUROSYS_TSB_BASE_URL`               | `baseUrl`             |
| `SECUROSYS_TSB_KEY_MANAGEMENT_API_KEY` | `keyManagementApiKey` |
| `SECUROSYS_TSB_KEY_OPERATION_API_KEY`  | `keyOperationApiKey`  |
| `SECUROSYS_TSB_BEARER_TOKEN`           | `bearerToken`         |
| `SECUROSYS_TSB_MTLS_P12_PATH`          | `mtlsP12Path`         |
| `SECUROSYS_TSB_MTLS_P12_PASSWORD`      | `mtlsP12Password`     |
| `SECUROSYS_TSB_KEY_PASSWORD`           | `keyPassword`         |
| `SECUROSYS_TSB_SIGNATURE_ALGORITHM`    | `signatureAlgorithm`  |

Every key created by this driver is first sent to TSB with a temporary
`wallet-{uuid}` label. After TSB returns the public key, the driver renames the
key through `PATCH /v1/key/changeAttributes` to a deterministic label derived
from the normalized public key. The label uses base64url form so it is safe for
TSB key-name handling and avoids collisions between users or networks that reuse
the same party hint.

### Key identifiers

`signTransaction` accepts the standard signing `keyIdentifier`:

- When `keyIdentifier.id` is supplied, it is used unchanged as the TSB key
  label.
- When only `keyIdentifier.publicKey` is supplied, the driver derives the label
  with `keyLabelFromPublicKey` and looks the key up by that label. This is the
  form the Wallet Gateway sends, and it matches the label given to keys created
  by this driver.

In both cases a supplied `publicKey` is kept, and signing fails if the TSB key
found for the label has a different public key. As a result, a direct driver
call with only a public key looks up the derived label and does not scan all TSB
keys. Keys that were not created by this driver, and so do not carry the
derived label, must be addressed by an explicit `id`.

Every key is created with the same empty SKA policy:

```json
{
    "ruleUse": null,
    "ruleBlock": null,
    "ruleUnblock": null,
    "ruleModify": null,
    "keyStatus": {
        "blocked": false
    }
}
```

For EdDSA signatures, the driver validates and returns the Wallet
Gateway-compatible format: base64-encoded raw 64-byte Ed25519 signature bytes.
The TSB request payload type is hardcoded to `UNSPECIFIED`, the signature type
is hardcoded to `RAW`, and TSB Ed25519 DER/SPKI public keys are always converted
to the 32-byte raw key expected by the wallet signing API. Simple ASN.1 OCTET
STRING / BIT STRING wrappers and DER `R,S` sequences are still converted as a
compatibility guard before returning the signature.

## Local wallet deployment

Run the wallet monorepo commands from the wallet repository root:

```bash
cd /path/to/wallet
```

See [`docs/CONTRIBUTING.md`](../../docs/CONTRIBUTING.md) for development environment setup.

Download the Playwright browsers required by the wallet browser tests:

```bash
pnpm playwright:install
```

Download the Canton binary used by the local devnet setup:

```bash
pnpm script:fetch:canton
```

Start local Canton on the devnet configuration:

```bash
pnpm start:canton --network=devnet
```

Wait until the Canton bootstrap completes. The command can then be interrupted
with `Ctrl+C`; the Canton process keeps running under PM2.

Start the full wallet stack with Securosys mTLS:

```bash
SECUROSYS_TSB_BASE_URL=https://integration-test.cloudshsm.com/ \
SECUROSYS_TSB_MTLS_P12_PATH=./etc/client_mtls_tsb.p12 \
SECUROSYS_TSB_MTLS_P12_PASSWORD=pass \
pnpm start:all
```

Start the full wallet stack with a TSB bearer token instead:

```bash
SECUROSYS_TSB_BASE_URL=https://sbx-rest-api.cloudshsm.com \
SECUROSYS_TSB_BEARER_TOKEN="<JWT Token>" \
pnpm start:all
```

Open the Wallet Gateway UI:

```bash
open http://localhost:3030
```

Check gateway health and readiness:

```bash
curl -i http://localhost:3030/healthz
curl -i http://localhost:3030/readyz
```

## Process management

List all PM2-managed wallet processes:

```bash
pnpm pm2 list
```

Inspect the remote Wallet Gateway logs:

```bash
pnpm pm2 logs remote
```

Inspect the Canton logs:

```bash
pnpm pm2 logs canton
```

Restart only the remote Wallet Gateway backend:

```bash
pnpm pm2 restart remote
```

Stop all PM2-managed wallet processes:

```bash
pnpm stop:all
```

Fully kill the PM2 daemon and all managed processes:

```bash
pnpm pm2 kill
```

## Build and test

Build only this signing driver:

```bash
pnpm workspace @canton-network/core-signing-securosys build
```

Run only this signing driver's tests:

```bash
pnpm nx test @canton-network/core-signing-securosys
```

Run this signing driver's tests with coverage:

```bash
pnpm nx test @canton-network/core-signing-securosys -c coverage
```

Build the remote Wallet Gateway:

```bash
pnpm workspace @canton-network/wallet-gateway-remote build
```

Run the remote Wallet Gateway transaction-signing tests:

```bash
pnpm nx test @canton-network/wallet-gateway-remote -- src/ledger/transaction-service.test.ts
```

Run the wallet allocation tests:

```bash
pnpm nx test @canton-network/wallet-gateway-remote -- src/ledger/wallet-allocation/wallet-allocation-service.test.ts
```

Run the shared signing-library tests:

```bash
pnpm nx test @canton-network/core-signing-lib
```

Build the full wallet monorepo serially:

```bash
pnpm build:all:serial
```

Run the full wallet monorepo test suite:

```bash
pnpm test:all
```

## References

- Upstream signing interface:
  <https://github.com/canton-network/wallet/tree/main/core/signing-lib>
- Blockdaemon signing driver used as the implementation reference:
  <https://github.com/canton-network/wallet/tree/main/core/signing-blockdaemon>
