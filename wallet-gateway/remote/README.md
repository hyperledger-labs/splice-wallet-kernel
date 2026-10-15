# Wallet Gateway

The RPC-based (server-side) Wallet Gateway.

# Usage

Install the Wallet Gateway

```shell
$ npm install -g @canton-network/wallet-gateway-remote

...

$ wallet-gateway -c ./config.json
```

Alternatively, you can run it directly through npx (tested with NodeJS v24):

`npx @canton-network/wallet-gateway-remote -c ./config.json`

By default, the service runs on port `3030`, but this can be overridden via the `-p, --port` CLI argument.

- The User web interface runs on `localhost:3030`
- The dApp JSON-RPC API is exposed on `localhost:3030/api/v0/dapp`
- The User JSON-RPC API is exposed on `localhost:3030/api/v0/user`

## Configuration

A configuration file is required to start up the Gateway. Create an example config to edit as a starting point:

```bash
wallet-gateway --config-example > config.json
```

To show the full [JSON Schema](https://json-schema.org/) representation of the configuration file:

```bash
wallet-gateway --config-schema
```

# Developing

## Codegen

The JSON-RPC API specs from `api-specs/` are generated into strongly-typed method builders for the remote RPC server. To update the codegen, run `pnpm generate:dapp`.

## Signing providers

`signingProviders` configuration has two modes:

- **Legacy** - for backwards compatibility only, will be removed in the future. Omit the `signingProviders` config property. Every provider stays available
  when its required environment variables are set. Non-secret settings also come
  from those environment variables.
- **Explicit** - include `signingProviders` config property. Each listed provider is opt-in by
  presence of its key. Non-secret settings come from the config object. Secret values stay in the environment variables,
  Config allows altering names of those variables via `*Env` fields (each defaults to the name used in legacy config).

### Wallet Kernel

**Gateway config:**

- `signingProviders.walletKernel` - set it to {} to enable
- `signingStore` - required for this provider, the provider is unavailable when the signing store is omitted

**Environment variables:**

- None

### Participant

**Gateway config:**

- `signingProviders.participant` - set it to `{}` to enable

**Environment variables:**

- None

### Dfns

Create a service account in the Dfns dashboard with permissions to create and sign with Canton wallets, then download its credentials.

**Gateway config:**

- `signingProviders.dfns` - include this object to enable
- `signingProviders.dfns.orgId` - required
- `signingProviders.dfns.credId` - required
- `signingProviders.dfns.baseUrl` - optional, defaults to `https://api.dfns.io`
- `signingProviders.dfns.privateKeyEnv` - optional name of the env var that holds the service account private key (PEM), defaults to `DFNS_PRIVATE_KEY`
- `signingProviders.dfns.authTokenEnv` - optional name of the env var that holds the service account auth token, defaults to `DFNS_AUTH_TOKEN`

**Environment variables:**

- The variables named by `privateKeyEnv` and `authTokenEnv` (defaults above)

### Fireblocks

Complete steps 1–3 from the instructions at https://github.com/canton-network/wallet/tree/main/core/signing-fireblocks.

**Gateway config:**

- `signingProviders.fireblocks` - include this object to enable
- `signingProviders.fireblocks.apiPath` - optional, defaults to `https://api.fireblocks.io/v1`
- `signingProviders.fireblocks.apiKeyEnv` - optional name of the env var that holds the API key, defaults to `FIREBLOCKS_API_KEY`
- `signingProviders.fireblocks.secretEnv` - optional name of the env var that holds the API secret, defaults to `FIREBLOCKS_SECRET`

**Environment variables:**

- The variables named by `apiKeyEnv` and `secretEnv` (defaults above)

### Blockdaemon

Create a system user in the Blockdaemon dashboard and save the API key displayed after successful creation.

**Gateway config:**

- `signingProviders.blockdaemon` - include this object to enable
- `signingProviders.blockdaemon.baseUrl` - optional, defaults to `http://localhost:5080/api/cwp/canton`
- `signingProviders.blockdaemon.caip2` - optional, defaults to `canton:testnet`
- `signingProviders.blockdaemon.apiKeyEnv` - optional name of the env var that holds the API key, defaults to `BLOCKDAEMON_API_KEY`

**Environment variables:**

- The variable named by `apiKeyEnv` (default above)

### Securosys

**Gateway config:**

- `signingProviders.securosys` - include this object to enable
- `signingProviders.securosys.baseUrl` - required
- `signingProviders.securosys.mtlsP12Path` - optional client PKCS#12/P12 file for mTLS
- `signingProviders.securosys.signatureAlgorithm` - optional TSB signature algorithm, defaults to `EDDSA`
- `signingProviders.securosys.keyManagementApiKeyEnv` - optional name of the env var that holds the key-management API key, defaults to `SECUROSYS_TSB_KEY_MANAGEMENT_API_KEY`
- `signingProviders.securosys.keyOperationApiKeyEnv` - optional name of the env var that holds the key-operation API key, defaults to `SECUROSYS_TSB_KEY_OPERATION_API_KEY`
- `signingProviders.securosys.bearerTokenEnv` - optional name of the env var that holds the bearer token, defaults to `SECUROSYS_TSB_BEARER_TOKEN`
- `signingProviders.securosys.mtlsP12PasswordEnv` - optional name of the env var that holds the PKCS#12/P12 password, defaults to `SECUROSYS_TSB_MTLS_P12_PASSWORD`
- `signingProviders.securosys.keyPasswordEnv` - optional name of the env var that holds the TSB key password, defaults to `SECUROSYS_TSB_KEY_PASSWORD`

**Environment variables:**

- The variables named by the `*Env` fields (defaults above)

See [`@canton-network/core-signing-securosys`](../../core/signing-securosys/README.md)
for key creation, public-key, and signature format details.

### BitGo

Create a long-lived access token in the BitGo dashboard and note the enterprise
ID used for wallet creation.

**Gateway config:**

- `signingProviders.bitgo` - include this object to enable
- `signingProviders.bitgo.baseUrl` - optional, defaults to `https://app.bitgo.com`
- `signingProviders.bitgo.enterpriseId` - optional, required for wallet creation and restart-safe transaction lookup
- `signingProviders.bitgo.coin` - optional, auto-detected from the API URL when omitted
- `signingProviders.bitgo.accessTokenEnv` - optional name of the env var that holds the access token, defaults to `BITGO_ACCESS_TOKEN`

**Environment variables:**

- The variable named by `accessTokenEnv` (default above)

See [`@canton-network/core-signing-bitgo`](../../core/signing-bitgo/README.md)
for credential setup and driver behavior.

## Postgres connection

To create a Postgres database you need to:

1. Start Postgres in Docker using:

```shell
$ docker run --network=host --name some-postgres -e POSTGRES_PASSWORD=postgres -d postgres
```

2. In the file `/wallet-gateway/test/config.json`, specify the connection settings for both databases - store (required) and signingStore (optional, only needed for signing provider `wallet-kernel`). The connection should look like this (it is important that `store.connection.database !== signingStore.connection.database !== 'postgres'`):

```json
{
    "store": {
        "connection": {
            "type": "postgres",
            "password": "postgres",
            "port": 5432,
            "user": "postgres",
            "host": "0.0.0.0",
            "database": "wallet_store"
        }
    },
    "signingStore": {
        "connection": {
            "type": "postgres",
            "password": "postgres",
            "port": 5432,
            "user": "postgres",
            "host": "0.0.0.0",
            "database": "signing_store"
        }
    }
}
```
