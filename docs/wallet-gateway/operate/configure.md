---
title: 'Configure the Wallet Gateway'
description: 'Understand the Wallet Gateway configuration file: kernel, server, store, and hashing scheme settings.'
---

The Wallet Gateway reads a single JSON configuration file that defines who the Wallet Gateway is,
how it serves requests, where it persists data, and which networks and identity providers it
starts with. This guide covers the file's structure and the kernel, server, store, and hashing
scheme sections. For networks and authentication, see
[Networks & identity providers](networks-and-identity.md).
For an exhaustive field reference, see the
[Configuration reference](../reference/configuration-reference.md).

## Generate a starting point

Write an example configuration you can edit:

```bash
wallet-gateway --config-example > config.json
```

To see the full JSON Schema (useful for validation and IDE autocompletion):

```bash
wallet-gateway --config-schema
```

## File structure

The configuration file has these top-level sections:

| Section            | Required | Purpose                                                                      |
| ------------------ | -------- | ---------------------------------------------------------------------------- |
| `kernel`           | yes      | Identity of this Wallet Gateway instance, served to dApps.                   |
| `server`           | yes      | Network binding, ports, API paths, and the admin user.                       |
| `store`            | yes      | Database connection for sessions, wallets, networks, IDPs, and transactions. |
| `bootstrap`        | yes      | Networks and identity providers seeded on first run.                         |
| `signingStore`     | no       | Secondary database for keys when using internal signing.                     |
| `signingProviders` | no       | signing providers configuration.                                             |
| `hashingScheme`    | no       | Ledger hashing scheme version used to compute transaction hashes.            |

A minimal configuration for a local setup looks like this:

```json
{
    "kernel": {
        "id": "remote-da",
        "clientType": "remote"
    },
    "server": {
        "port": 3030,
        "dappPath": "/api/v0/dapp",
        "userPath": "/api/v0/user",
        "allowedOrigins": ["http://localhost:8080"],
        "admin": "operator"
    },
    "store": {
        "connection": {
            "type": "sqlite",
            "database": "store.sqlite"
        }
    },
    "bootstrap": {
        "idps": [],
        "networks": []
    }
}
```

Fill in `bootstrap.idps` and `bootstrap.networks` following
[Networks & identity providers](networks-and-identity.md).

## Kernel

The `kernel` section identifies this Wallet Gateway instance to dApps.

- `id` (required): a stable, unique identifier, for example `"my-gateway-prod"`.
- `clientType` (required): `"remote"` for a remote Wallet Gateway.
- `publicUrl` (optional): the base URL used to redirect clients. If omitted, it is derived
  from the server host and port. Set this when running behind a reverse proxy or load
  balancer.

```json
{
    "kernel": {
        "id": "my-production-gateway",
        "clientType": "remote",
        "publicUrl": "https://wallet.example.com"
    }
}
```

## Server

The `server` section configures binding, ports, and API paths.

- `port` (optional, default `3030`): the port the server binds to. Also used to generate
  popup URLs in the discovery flow.
- `dappPath` (optional, default `/api/v0/dapp`): the path where dApps connect.
- `userPath` (optional, default `/api/v0/user`): the path used by the User UI and User API.
- `allowedOrigins` (optional, default `["*"]`): CORS allowed origins. In production, list
  exact origins instead of `"*"`.
- `requestSizeLimit` (optional, default `"1mb"`): maximum request body size.
- `requestRateLimit` (optional, default `10000`): maximum requests per minute per IP
  (health endpoints excluded).
- `admin` (optional): the user ID (JWT `sub` claim) granted admin privileges, which allow
  managing networks and identity providers at runtime. If omitted, network and IDP
  management is restricted to the bootstrap configuration.

```json
{
    "server": {
        "port": 3030,
        "dappPath": "/api/v0/dapp",
        "userPath": "/api/v0/user",
        "allowedOrigins": ["https://my-dapp.example.com"],
        "requestSizeLimit": "10mb",
        "requestRateLimit": 10000,
        "admin": "operator"
    }
}
```

### Signing worker

When automations sign through an external custody provider, `server.signingWorker` controls the
background worker that completes transactions once the provider approves:

```json
{
    "server": {
        "signingWorker": {
            "pollInterval": 5000
        }
    }
}
```

- `signingWorker.pollInterval` (optional, default `5000` ms): how often the worker polls external
  signers (Fireblocks, Blockdaemon, DFNS) while a transaction stays `pending`. See
  [Service account automations](../automation/service-account-automations.md).

## Store

The `store` connection determines where the Wallet Gateway persists sessions, wallet
configurations, networks, identity providers, and in-flight transactions. Three backends are
available:

| Backend    | Use for             | Persistence                          |
| ---------- | ------------------- | ------------------------------------ |
| `memory`   | Quick testing       | Lost on restart.                     |
| `sqlite`   | Local development   | Persists to a file.                  |
| `postgres` | Production and test | Reliable, scalable, backup-friendly. |

```json
{
    "store": {
        "connection": {
            "type": "postgres",
            "host": "db.example.com",
            "port": 5432,
            "user": "wallet_gateway",
            "password": "secure-password",
            "database": "wallet_gateway_db"
        }
    }
}
```

> [!WARNING]
> With the `memory` store in Docker or Kubernetes, all data is lost when the container or pod is
> recreated. `sqlite` persists only if the database file is on a persistent volume. Use
> `postgres` for production. See the
> [Configuration reference](../reference/configuration-reference.md)
> for backup guidance.

For PostgreSQL over TLS, add an `ssl` block to the connection. See
[PostgreSQL over TLS/SSL](../reference/configuration-reference.md#postgresql-over-tls-ssl).

## Signing store

The optional `signingStore` is a secondary database used only when the Wallet Gateway signs
transactions itself (the internal signing provider). It uses the same connection options as
`store`. Omit it entirely when using a participant node or an external custody provider.

```json
{
    "signingStore": {
        "connection": {
            "type": "sqlite",
            "database": "signingStore.sqlite"
        }
    }
}
```

> [!WARNING]
> The internal signing provider stores private keys in the signing store database. Do not use it
> in production systems with valuable assets. See
> [Signing providers](signing-providers.md).

## Hashing scheme

The optional `hashingScheme` section selects the hashing scheme version used to compute
transaction hashes on the ledger. It defaults to `HASHING_SCHEME_VERSION_V3` and can be
downgraded to `HASHING_SCHEME_VERSION_V2` if a connected participant still requires it.

```json
{
    "hashingScheme": {
        "version": "HASHING_SCHEME_VERSION_V3"
    }
}
```

## Next steps

- [Networks & identity providers](networks-and-identity.md): Connect to a validator and configure authentication.
- [Configuration reference](../reference/configuration-reference.md): Every field, all auth methods, and per-environment guidance.
