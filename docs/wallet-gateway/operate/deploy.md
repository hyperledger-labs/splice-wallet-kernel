---
title: 'Deploy'
description: 'Run the Wallet Gateway in production with Docker or Helm.'
---

For anything beyond local development, run the Wallet Gateway as a container. It ships in both
**Docker** and **Helm** variants, and the images and charts are **public** on the GitHub
Container Registry, so no access request is required.

- **Docker registry**: `ghcr.io/digital-asset/wallet-gateway/docker/wallet-gateway:<VERSION>`
- **Helm repository**: `ghcr.io/digital-asset/wallet-gateway/helm/wallet-gateway:<VERSION>`

Replace `<VERSION>` with the version you want to deploy; there is currently no `latest` tag. To
find a version, check the [GHCR tags](https://github.com/digital-asset/wallet-gateway/pkgs/container/wallet-gateway%2Fdocker%2Fwallet-gateway)
or the matching [npm package](https://www.npmjs.com/package/@canton-network/wallet-gateway-remote).

## Before you deploy

Make production choices in your configuration file before packaging it. See
[Configure the Wallet Gateway](configure.md) and the
[Configuration reference](../reference/configuration-reference.md).

- **Use a persistent store.** Prefer `postgres`. The `memory` store loses all data when a
  container or pod is recreated, and `sqlite` persists only if its file is on a persistent
  volume.
- **Set `kernel.publicUrl`.** Behind a reverse proxy or load balancer, set it to the external
  URL so OAuth redirects and discovery work.
- **Restrict CORS.** Set `server.allowedOrigins` to your known dApp origins instead of `"*"`.
- **Keep secrets out of the image.** Supply `clientSecret`, `adminAuth`, and provider API keys
  through environment variables or a secret manager, not the baked-in config file. See
  [Secrets and environments](../reference/configuration-reference.md#secrets-and-environments).

## Expose the service

The Wallet Gateway must be reachable over **HTTPS** from browsers that open the User UI and from
hosted dApps that call the dApp API. In Kubernetes, expose it with an Ingress or LoadBalancer
that terminates TLS and forwards to the pod port (default `3030`). Set `kernel.publicUrl` to that
external URL so OAuth redirects and discovery work correctly. Subpath routing (for example
`https://wallet.example.com/subpath`) is supported.

## Docker

The container needs a configuration file. If you don't have one, generate a sample to start
from:

```shell
# via Docker
docker run --rm \
  ghcr.io/digital-asset/wallet-gateway/docker/wallet-gateway:<VERSION> --config-example > config.json

# or via npx
npx @canton-network/wallet-gateway-remote@<VERSION> --config-example > config.json
```

Mount the config and start the service:

```shell
docker run -p 3030:3030 \
  -v ${PWD}/config.json:/app/config.json:ro \
  ghcr.io/digital-asset/wallet-gateway/docker/wallet-gateway:<VERSION>
```

The login page is then available at `http://localhost:3030`.

> [!WARNING]
> If you use the internal signing provider, its `signingStore` holds private keys. Put it on
> durable, access-controlled storage, or use a participant node or external custody provider
> instead. See [Signing providers](signing-providers.md).

## Helm

An official Helm chart is available for Kubernetes. The full
[values schema](https://github.com/digital-asset/wallet-gateway/blob/main/charts/wallet-gateway/values.schema.json)
is published, but the key point is that the Wallet Gateway is configured through the top-level
`config:` key in `values.yaml`, specified as YAML but using the same schema as `config.json`.

### Signing chart values (`signing: {}`)

The chart's `signing` block configures **optional** external signing drivers (Blockdaemon, DFNS,
Fireblocks). Leaving it empty is the common case for participant-based signing:

```yaml
signing: {}
```

You do not need participant-specific fields under `signing` when the participant node handles
keys. Add entries only to enable an external custody provider:

```yaml
signing:
    # optional, define to enable blockdaemon integration -- or omit
    blockdaemon:
        apiUrl: 'http://localhost:5080/api/cwp/canton'
        apiKeyRef:
            name: 'blockdaemon-creds'
            key: 'api-key'
    # optional, define to enable fireblocks integration -- or omit
    fireblocks:
        apiKeyRef:
            name: 'fireblocks-creds'
            key: 'fb-api-key'
        secretRef:
            name: 'fireblocks-creds'
            key: 'fb-secret'
```

### OAuth secrets from Kubernetes secrets (`oauthSecrets`)

The chart can inject OAuth client secrets from Kubernetes secrets by mapping an environment
variable name to a secret reference, then referencing that variable from a network's auth config:

```yaml
oauthSecrets:
    # map a kubernetes secret to a Wallet Gateway network auth config
    MY_OAUTH2_CLIENT_SECRET:
        secretRef:
            name: 'my-oauth'
            key: 'client-secret'

config:
    networks:
        - id: 'my-network'
          adminAuth:
              # should correlate to a secret provided in oauthSecrets
              clientSecretEnv: 'MY_OAUTH2_CLIENT_SECRET'
```

## Production configuration highlights

Read the [Configuration reference](../reference/configuration-reference.md)
first for the complete breakdown. The following (incomplete) YAML highlights fields worth setting
for a production deployment:

```yaml
kernel:
    # Publicly accessible URL users connect to. Subpath routing is supported.
    publicUrl: 'https://wallet.example.com/subpath'
server:
    # In Helm/k8s, keep the default 3030 and route internally from your
    # Ingress/LoadBalancer (exposed on 443) to the pod's port. Terminate TLS at the cluster edge.
    port: 3030
    # Origins for the set of web dApps allowed to call the dApp API.
    allowedOrigins:
        - 'https://dapp1.example.com'
        - 'https://dapp2.example.com'
    # Default (5mb) may need bumping for large contract payloads.
    requestSizeLimit: '5mb'
    # Default 10000 requests / minute / IP. Bump if you hit HTTP 429 during regular use.
    requestRateLimit: 10000
bootstrap:
    networks:
        - adminAuth:
              # For production, inject OAuth secrets via the environment (secrets manager),
              # naming the environment variable to read for this network.
              clientSecretEnv: 'OAUTH2_CLIENT_SECRET'
```

### Signing provider environment variables

Signing provider secrets stay in the environment. In explicit mode, config `*Env` fields name
those variables (defaults below). In legacy mode the same default names are used.

| Provider    | Config field                             | Default variable      | Description                              |
| ----------- | ---------------------------------------- | --------------------- | ---------------------------------------- |
| Fireblocks  | `signingProviders.fireblocks.apiKeyEnv`  | `FIREBLOCKS_API_KEY`  | API key for the Fireblocks integration.  |
| Fireblocks  | `signingProviders.fireblocks.secretEnv`  | `FIREBLOCKS_SECRET`   | Secret for the Fireblocks integration.   |
| Blockdaemon | `signingProviders.blockdaemon.apiKeyEnv` | `BLOCKDAEMON_API_KEY` | API key for the Blockdaemon integration. |

See [Signing providers](signing-providers.md) for more.

## Database persistence

### SQLite

The default config uses `sqlite`, which is fine for evaluation and short-lived environments, but
**PostgreSQL is recommended for production**. SQLite stores data in local files; without a
persistent volume, all sessions and wallet state are lost when the pod is recreated. Point the
stores at a path inside the container:

```yaml
# config YAML for Helm, or equivalent config.json
signingStore:
    connection:
        type: 'sqlite'
        database: '/data/signing_store.sqlite'
store:
    connection:
        type: 'sqlite'
        database: '/data/store.sqlite'
```

Then mount a volume for that path:

```shell
docker run -p 3030:3030 \
  -v ${PWD}/config.json:/app/config.json:ro \
  -v ${PWD}/data:/data \
  ghcr.io/digital-asset/wallet-gateway/docker/wallet-gateway:<VERSION>
```

### PostgreSQL

Point the store at a PostgreSQL instance:

```yaml
# config YAML for Helm, or equivalent config.json
store:
    connection:
        type: 'postgres'
        host: '<HOST_NAME>'
        port: 5432
        database: '<DB_NAME>'
        user: '<DB_USERNAME>'
        password: '<DB_PASSWORD>'
```

Prefer `passwordEnv` over an inline password so the credential comes from the environment (or a
Kubernetes secret) rather than the config file:

```yaml
# config YAML for Helm
config:
    store:
        connection:
            type: 'postgres'
            host: '<HOST_NAME>'
            port: 5432
            database: '<DB_NAME>'
            user: '<DB_USERNAME>'
            passwordEnv: 'POSTGRES_DB_PASSWORD'

extraEnv:
    # example names for illustrative purposes: adapt to your specific needs
    - name: POSTGRES_DB_PASSWORD
      valueFrom:
          secretKeyRef:
              name: my-database-secrets
              key: postgres-db-password
```

For TLS to PostgreSQL, add an `ssl` block (passed through to the Node.js `pg` driver). See
[PostgreSQL over TLS/SSL](../reference/configuration-reference.md#postgresql-over-tls-ssl).

### Local PostgreSQL over TLS (Docker)

For local development you can run PostgreSQL in Docker with TLS enabled and point the Wallet
Gateway's `store` / `signingStore` at it.

> [!NOTE]
> This configures TLS **between the Wallet Gateway and PostgreSQL**. It does not configure HTTPS
> for browsers. For browser/client HTTPS, terminate TLS in your reverse proxy or ingress and set
> `kernel.publicUrl` to the external `https://...` URL.

**1. Create TLS files for Postgres (self-signed):**

```bash
mkdir -p .dev/postgres-tls
cd .dev/postgres-tls

# server key + cert (CN=localhost)
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout server.key -out server.crt -days 365 \
  -subj "/CN=localhost"

# Postgres requires strict key perms
chmod 600 server.key

# pg_hba: allow local socket (for init), enforce TLS for TCP
cat > pg_hba.conf <<'EOF'
# TYPE  DATABASE  USER  ADDRESS       METHOD
local   all       all                 scram-sha-256
hostssl all       all   0.0.0.0/0     scram-sha-256
hostssl all       all   ::/0          scram-sha-256
EOF

cd ../..
```

**2. Run Postgres with TLS enabled:**

```bash
docker rm -f local-postgres 2>/dev/null || true

docker run --name local-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=app_db \
  -e POSTGRES_INITDB_ARGS="--auth-host=scram-sha-256 --auth-local=scram-sha-256" \
  -p 5432:5432 \
  -v "$PWD/.dev/postgres-tls/server.crt:/var/lib/postgresql/server.crt:ro" \
  -v "$PWD/.dev/postgres-tls/server.key:/var/lib/postgresql/server.key:ro" \
  -v "$PWD/.dev/postgres-tls/pg_hba.conf:/var/lib/postgresql/pg_hba.conf:ro" \
  -d postgres:16 \
  -c ssl=on \
  -c ssl_cert_file=/var/lib/postgresql/server.crt \
  -c ssl_key_file=/var/lib/postgresql/server.key \
  -c hba_file=/var/lib/postgresql/pg_hba.conf
```

**3. Verify TLS works:**

```bash
docker exec -e PGPASSWORD=postgres local-postgres \
  psql "host=127.0.0.1 port=5432 user=postgres dbname=app_db sslmode=require" \
  -c "select current_setting('ssl') as ssl_on;"
```

Expected: `ssl_on` = `on`.

**4. Configure the Wallet Gateway stores to use TLS:**

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
    },
    "signingStore": {
        "connection": {
            "type": "postgres",
            "host": "localhost",
            "port": 5432,
            "user": "postgres",
            "password": "postgres",
            "database": "app_signing_db",
            "ssl": { "rejectUnauthorized": false }
        }
    }
}
```

For production, prefer certificate verification with `rejectUnauthorized: true` and provide your
CA bundle via `ssl.ca`. See
[PostgreSQL over TLS/SSL](../reference/configuration-reference.md#postgresql-over-tls-ssl).

## Logging

Enable JSON logging with the `--log-format` flag (`pretty` is the default):

```shell
docker run -p 3030:3030 \
  -v ${PWD}/config.json:/app/config.json:ro \
  ghcr.io/digital-asset/wallet-gateway/docker/wallet-gateway:<VERSION> \
  --log-format=json
```

## After deploying

- Confirm the three endpoints respond (User UI, `/api/v0/dapp`, `/api/v0/user`).
- Review the [Security checklist](security.md).
- If something fails to start, see [Troubleshooting](troubleshooting.md).
