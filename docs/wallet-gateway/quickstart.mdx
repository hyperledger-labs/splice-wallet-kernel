---
title: 'Quickstart'
description: 'Install the Wallet Gateway, configure it, run it against a network, and verify it is up.'
---

This is the shortest path to a running Wallet Gateway: install it, generate a configuration
file, start it against a Canton network, and confirm its three endpoints respond. It targets
a local setup you can adapt to your own validator.

> [!NOTE]
> You need Node.js (tested with v24) and access to a Canton network's Ledger API. For a fully
> local target, run a [Splice LocalNet](https://docs.canton.network/sdks-tools/development-tools/localnet).

### Install the Wallet Gateway

Install globally with npm:

```bash
npm install -g @canton-network/wallet-gateway-remote
```

Or run it without installing, using `npx`:

```bash
npx @canton-network/wallet-gateway-remote -c ./config.json
```

`npx` downloads and runs the latest version each time, which is useful for one-off runs.

### Generate a configuration file

Write an example configuration you can edit:

```bash
wallet-gateway --config-example > config.json
```

The example targets a Splice LocalNet with SQLite storage and a mock OAuth identity provider.

### Edit the configuration

Open `config.json` and set, at minimum:

- **Store**: where the Wallet Gateway persists data (`memory`, `sqlite`, or `postgres`).
- **Networks**: at least one Canton network with its Ledger API `baseUrl`.
- **Identity providers**: how users authenticate against those networks.

See [Configure the Wallet Gateway](operate/configure.md) for every option, and
[Networks & identity providers](operate/networks-and-identity.md) to
wire up authentication.

### Start the Wallet Gateway

```bash
wallet-gateway -c ./config.json
```

Override the port with `-p` if needed:

```bash
wallet-gateway -c ./config.json -p 8080
```

### Verify it is running

The Wallet Gateway exposes three endpoints (default port `3030`):

- **User UI**: `http://localhost:3030`
- **dApp API**: `http://localhost:3030/api/v0/dapp`
- **User API**: `http://localhost:3030/api/v0/user`

Open the User UI in your browser to confirm the Wallet Gateway is up.

## Command-line options

| Option                      | Description                                                 |
| --------------------------- | ----------------------------------------------------------- |
| `-c, --config <path>`       | Set the config path (default: `./config.json`).             |
| `--config-schema`           | Output the config JSON Schema and exit.                     |
| `--config-example`          | Output an example config and exit.                          |
| `-p, --port [port]`         | Set the port (overrides the config file).                   |
| `-f, --log-format <format>` | Set the log format: `json` or `pretty` (default: `pretty`). |

The `--config-schema` output is a complete JSON Schema you can use for validation and IDE
autocompletion.

## Next steps

- [Configure the Wallet Gateway](operate/configure.md): All configuration options for kernel, server, and store.
- [Networks & identity providers](operate/networks-and-identity.md): Connect to a validator and set up authentication.
- [Party management](use/party-management.md): Create and manage wallets through the User UI or User API.
- [Deploy](operate/deploy.md): Run the Wallet Gateway with Docker or Helm.
