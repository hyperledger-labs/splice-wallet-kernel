# Wallet Kernel API specification

This folder contains the OpenRPC specification for the Wallet Kernel JSON-RPC API.

## Contribute

You can contribute to the API specs using the following steps.

1. Edit the API specs in the `openrpc.json` file. (See the [OpenRPC](https://open-rpc.org/) docs for more information on how to format the specs).
2. `yarn install` if you haven't previously set up the repository.
3. To view the result, paste the spec file's contents into the [OpenRPC playground](https://playground.open-rpc.org/) or use the [VSCode extension](https://marketplace.visualstudio.com/items?itemName=OPEN-RPC.OPEN-RPC).

## Mock Server

This project comes with an OpenRPC Mock Server to test against the Wallet Kernel API.

Start either of the servers (from the repository root):

```sh
yarn workspace @splice/api-specs dapp-mock-server
yarn workspace @splice/api-specs user-mock-server
yarn workspace @splice/api-specs signing-mock-server
```

The server now runs on [localhost:3333](http://localhost:3333/).

Use Postman (or similar) to submit a request agains this endpoint with application/json body, e.g.:

```json
{
    "id": 1,
    "jsonrpc": "2.0",
    "method": "connect",
    "params": []
}
```

## Ledger API specs

To get a new version of the Ledger API specs, run the following command:

```sh
. yarn script:fetch:ledger
```

It will download the latest ledger API specs used in the splice repo, if splice is not using the desired version then a manual copy is required.
You can change the target branch in the script if needed to generate for an older version.

If new generation of clients are needed then run the following command:

```sh
. yarn script:generate:ledger
```
