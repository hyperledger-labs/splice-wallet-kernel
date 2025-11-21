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

The JSON-RPC API specs from `api-specs/` are generated into strongly-typed method builders for the remote RPC server. To update the codegen, run `yarn generate:dapp`.

## Fireblocks

1. Complete steps 1–3 from the instructions at https://github.com/hyperledger-labs/splice-wallet-kernel/tree/main/core/signing-fireblocks

2. Place the `fireblocks_secret.key` file at the path `/splice-wallet-kernel/wallet-gateway/remote`

3. Create a file named `fireblocks_api.key` at the path `/splice-wallet-kernel/wallet-gateway/remote` and insert your Fireblocks API key into it
