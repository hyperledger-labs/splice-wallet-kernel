# Deploying a wallet gateway

This section outlines some recommendations for production deployments of the Wallet Gateway service.

The service is available in both Docker and Helm variants:

- **Docker Registry**: `ghcr.io/digital-asset/wallet-gateway/docker/wallet-gateway:0.20.0`
- **Helm Repository**: `ghcr.io/digital-asset/wallet-gateway/helm/wallet-gateway:0.20.0`

Note that we don't currently publish `latest` tags. To determine which version to use, check either

- The latest version displayed on the GHCR repo: https://github.com/digital-asset/wallet-gateway/pkgs/container/wallet-gateway%2Fdocker%2Fwallet-gateway
- The version corresponding to the NPM package: https://www.npmjs.com/package/@canton-network/wallet-gateway-remote

## Docker

To run the Docker container, a configuration file must be supplied for the Wallet Gateway. If you don't have a configuration, you can generate a sample config to serve as a starting point:

```shell
# via Docker
docker run --rm ghcr.io/digital-asset/wallet-gateway/docker/wallet-gateway:0.20.0 --config-example > config.json

# alternatively, generate a sample config file via NPM
npx @canton-network/wallet-gateway-remote@0.20.0 --config-example > config.json
```

With the default config file, start the service:

```shell
docker run -p 3030:3030 \
    -v ${PWD}/config.json:/app/config.json:ro \
    ghcr.io/digital-asset/wallet-gateway/docker/wallet-gateway:0.20.0
```

If all went well, the Wallet Gateway login page can be opened in a browser at http://localhost:3030.

## Helm

An official Helm chart is available for Kubernetes deployments. The full values.schema is [here](https://github.com/digital-asset/wallet-gateway/blob/main/charts/wallet-gateway/values.schema.json), but the important thing to note is that the Wallet Gateway is configured through the top-level `config:` key in `values.yaml`.

The config is then specified as YAML, but otherwise uses the same schema as `config.json`.

## Configuration

The [Configuration](../configuration/index.md) section contains a complete breakdown of the options. Please read through that page first, then return here.

The following config is incomplete, but highlights specific fields of note to consider for a production deployment:

```yaml
kernel:
    # Set the publically accessible URL that users would use to connect to the deployed Wallet Gateway.
    # Subpath routing is also supported as of v0.20.0
    publicUrl: 'https://wallet.example.com/subpath'
server:
    # In a Helm/k8s setup, we recommend leaving the port set to the default `3030` value,
    # and routing the service internally from your Ingress/LoadBalancer (exposed on 443) to the pod's port.

    # We strongly recommend TLS termination of your cluster, so that the Wallet Gateway is accessible to clients over `https`.
    port: 3030

    # Set this to an array of origins corresponding to the set of web dApps that are allowed to call the dApp API.
    allowedOrigins:
        - 'https://dapp1.example.com'
        - 'https://dapp2.example.com'

    # The default value (`5mb`) may need to be bumped for heavy use (large contract payloads may exceed this).
    requestSizeLimit: '5mb'

    # Default is `10000` requests / second / IP address. Bump if encountering HTTP 429 errors during regular use.
    requestRateLimit: 10000
bootstrap:
    networks:
        - adminAuth:
              # For PRODUCTION, we recommend providing OAuth secrets for network admins via the environment.
              # This allows the secret to be stored in a secure secrets manager, and injected into the container at runtime.
              # This field defines the name of the environment variable to use for this network.
              clientSecretEnv: 'OAUTH2_CLIENT_SECRET'
```

### Environment Variables

Aside from the dynamic environment variables supported in config (`networks[].adminAuth.clientSecretEnv`), there are a few static environment variables available to configure external signing providers:

**Fireblocks**

- `FIREBLOCKS_API_KEY`: The API key for the Fireblocks integration
- `FIREBLOCKS_SECRET`: The secret for the Fireblocks integration

**Blockdaemon**

- `BLOCKDAEMON_API_KEY`: The API key for the Blockdaemon integration
- `BLOCKDAEMON_API_URL`: The URL for the Blockdaemon API

See [Signing Providers](../signing-providers/index.md) for more information.

## Database Persistence

### SQLite

The default config uses `sqlite` as a persistent data store for the Wallet Gateway. To prevent the data from being reset across container restarts, the sqlite files must be mounted to a volume.

First, configure the stores to point somewhere in the container:

```yaml
# config YAML for helm, or equivalent config.json
signingStore:
    connection:
        type: "sqlite",
        database: "/data/signing_store.sqlite"
store:
    connection:
        type: "sqlite",
        database: "/data/store.sqlite"
```

Then start the container with the volume mount

```shell
docker run -p 3030:3030 \
    -v ${PWD}/config.json:/app/config.json:ro \
    -v ${PWD}/data:/data \
    ghcr.io/digital-asset/wallet-gateway/docker/wallet-gateway:0.20.0
```

### PostgreSQL

Alternatively, the Wallet Gateway can be configured to use a separate PostgreSQL connection:

```yaml
# config YAML for helm, or equivalent config.json
store:
    connection:
        type: "postgres",
        host: "<HOST_NAME>",
        port: 5432,
        database: "<DB_NAME>",
        user: "<DB_USERNAME>",
        password: "<DB_PASSWORD>"
```

## Logging

JSON logging can be enabled via the `--log-format` CLI flag (values: `"pretty" (default) | "json"`):

```shell
docker run -p 3030:3030 \
    -v ${PWD}/config.json:/app/config.json:ro \
    ghcr.io/digital-asset/wallet-gateway/docker/wallet-gateway:0.20.0 \
    --log-format=json
```
