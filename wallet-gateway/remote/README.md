# Wallet Gateway

The RPC-based (server-side) Wallet Gateway.

# Usage

Start the service directly through npx (tested with NodeJS v24):

`npx @canton-network/wallet-gateway-remote -c ./config.json`

This exposes:

- A dApp JSON-RPC API running on (by default) `localhost:3008`
- A User JSON-RPC API running on (by default) `localhost:3001`
- A User web interface running on (by default) `localhost:3002`

## Configuration

A configuration file is required to start up the gateway. See [config.json](https://github.com/hyperledger-labs/splice-wallet-kernel/blob/main/wallet-gateway/test/config.json) for an example.

# Developing

## Codegen

The JSON-RPC API specs from `api-specs/` are generated into strongly-typed method builders for the remote RPC server. To update the codegen, run `yarn generate:dapp`.
