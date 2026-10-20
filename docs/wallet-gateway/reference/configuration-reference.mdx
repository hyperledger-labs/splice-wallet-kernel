---
title: 'Configuration reference'
description: 'Full reference for the Wallet Gateway store backends, backups, signing store, and secrets.'
---

This reference complements the task-oriented guides with the details you need for production:
the store backends in full, backup and recovery, signing store security, and how to handle
secrets across environments. For the config file's overall shape, see
[Configure the Wallet Gateway](../operate/configure.md). For networks and
authentication, see [Networks & identity providers](../operate/networks-and-identity.md).

## Full configuration schema

For the complete JSON Schema of the configuration file, including every field and type, run:

```bash
wallet-gateway --config-schema
```

Use the output for validation and IDE autocompletion; the generated schema is the authoritative
source for all configuration options.

## Store backends

The `store.connection` object selects one of three backends.

### PostgreSQL

Recommended for production for its robustness, concurrent access, and backup support.

| Field         | Required            | Description                                                                                                       |
| ------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `type`        | yes                 | Must be `"postgres"`.                                                                                             |
| `host`        | yes                 | Hostname or IP of the PostgreSQL server.                                                                          |
| `port`        | no (default `5432`) | Port PostgreSQL listens on.                                                                                       |
| `user`        | yes                 | Database user to connect with.                                                                                    |
| `password`    | one of              | Password for the database user. Do not set together with `passwordEnv`.                                           |
| `passwordEnv` | one of              | Name of the environment variable that holds the database password. Prefer this in production.                     |
| `database`    | yes                 | Name of the database to use (must exist).                                                                         |
| `ssl`         | no                  | TLS settings, passed through to the Node.js `pg` driver. See [PostgreSQL over TLS/SSL](#postgresql-over-tls-ssl). |

Provide exactly one of `password` or `passwordEnv`. For Helm, inject the variable with `extraEnv`
and a Kubernetes secret; see [Deploy](../operate/deploy.md#postgresql).

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

### PostgreSQL over TLS/SSL

If your PostgreSQL server requires TLS (common in managed databases and hardened deployments),
add an `ssl` object under `store.connection` and, if used, `signingStore.connection`. The Wallet
Gateway only configures client-side TLS; it never needs the server's private key.

**Local testing** (self-signed server cert, encryption only): set `rejectUnauthorized: false`.

```json
{
    "store": {
        "connection": {
            "type": "postgres",
            "host": "localhost",
            "port": 5432,
            "user": "postgres",
            "password": "postgres",
            "database": "app_db",
            "ssl": { "rejectUnauthorized": false }
        }
    }
}
```

**Production** (verify the server certificate): set `rejectUnauthorized: true` and provide the CA
certificate PEM that signed the server certificate via `ssl.ca`.

```json
{
    "store": {
        "connection": {
            "type": "postgres",
            "host": "db.example.com",
            "port": 5432,
            "user": "wallet_gateway",
            "password": "secure-password",
            "database": "wallet_gateway_db",
            "ssl": {
                "rejectUnauthorized": true,
                "ca": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n"
            }
        }
    }
}
```

For a local Docker-based Postgres-over-TLS walkthrough, see
[Deploy](../operate/deploy.md#local-postgresql-over-tls-docker).

### SQLite

Suitable for single-instance deployments and local development. Stores all data in one file.

| Field      | Required | Description                       |
| ---------- | -------- | --------------------------------- |
| `type`     | yes      | Must be `"sqlite"`.               |
| `database` | yes      | Path to the SQLite database file. |

```json
{
    "store": {
        "connection": {
            "type": "sqlite",
            "database": "store.sqlite"
        }
    }
}
```

### Memory

Keeps all data in RAM. Useful for testing, not for production.

| Field  | Required | Description         |
| ------ | -------- | ------------------- |
| `type` | yes      | Must be `"memory"`. |

```json
{
    "store": {
        "connection": {
            "type": "memory"
        }
    }
}
```

## Backups and recovery

The store database holds user sessions, networks and IDPs (seeded from bootstrap, then
modifiable at runtime), wallet configurations and party mappings, and in-flight transactions.

If the database is lost and cannot be restored:

- All sessions are invalidated (users must log in again).
- Networks and IDPs are re-seeded from bootstrap, but runtime changes are lost.
- In-flight transactions are lost and may need manual intervention.
- Wallets referencing lost networks may need reconfiguration.

Recommendations:

- **PostgreSQL**: use `pg_dump` or an automated solution (pgBackRest, WAL-E).
- **SQLite**: copy the database file regularly, with no writes during the copy.
- Schedule automated daily backups with a retention policy, and test restores.

> [!WARNING]
> If the Wallet Gateway is used as the signing provider, the signing store holds private keys. If it is
> lost, those keys are unrecoverable. Do not use internal signing for any important system. See
> [Signing providers](../operate/signing-providers.md).

## Signing store security

The optional `signingStore` uses the same connection options as `store` and is only needed for
the internal signing provider. When it holds keys:

- Store the file in a secure location with restricted access.
- Use strict filesystem permissions (for example `chmod 600` for SQLite files).
- For PostgreSQL, use separate credentials with minimal privileges.
- Consider encrypting the database at rest.
- Back it up regularly if it holds production keys.
- Never commit signing store files to version control.

## Secrets and environments

Maintain separate configuration files per environment (for example `config.dev.json`,
`config.staging.json`, `config.prod.json`) to isolate settings and credentials.

Never commit secrets. Override sensitive values with environment variables using the `Env`
suffix on the field, for example `clientSecretEnv` or `passwordEnv`:

```json
{
    "bootstrap": {
        "networks": [
            {
                "auth": {
                    "clientSecretEnv": "OAUTH_CLIENT_SECRET"
                }
            }
        ]
    }
}
```

Then set the variable when running:

```bash
export OAUTH_CLIENT_SECRET="my-secret"
wallet-gateway -c ./config.json
```

Additional guidance:

- Network and IDP configurations (excluding secrets) are visible to users with ledger access.
- Anyone with read access to a shared config repository can see non-secret configuration.
- Use environment variables or a secret manager (HashiCorp Vault, AWS Secrets Manager) for
  sensitive values.
- `adminAuth` credentials are sensitive: store them securely, rotate them regularly, and use
  them only where truly needed.

### Suggested environment profiles

| Setting           | Development            | Production                              |
| ----------------- | ---------------------- | --------------------------------------- |
| Store             | SQLite or memory       | PostgreSQL                              |
| Authentication    | Self-signed            | OAuth                                   |
| Network endpoints | Localhost              | Production endpoints                    |
| CORS              | Permissive             | Restricted to known origins             |
| Secrets           | Inline (non-sensitive) | Environment variables or secret manager |
