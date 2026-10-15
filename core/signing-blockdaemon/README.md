# @canton-network/core-signing-blockdaemon

This package provides a signing driver for integrating the Wallet Gateway with [Blockdaemon](https://blockdaemon.com/). It implements the `SigningDriverInterface` defined in `@canton-network/core-signing-lib`, allowing the Wallet Gateway to manage keys and sign transactions using Blockdaemon's infrastructure.

## Installation

This package is part of the Wallet Gateway monorepo and is typically installed as a workspace dependency.

```bash
pnpm add @canton-network/core-signing-blockdaemon
```

## Usage

The `BlockdaemonSigningDriver` is designed to be used within the Wallet Gateway's signing architecture. It requires a configuration object containing the `baseUrl` and `apiKey` for the Blockdaemon service.

### Initialization

```typescript
import BlockdaemonSigningDriver, {
    BlockdaemonConfig,
} from '@canton-network/core-signing-blockdaemon'

const config: BlockdaemonConfig = {
    baseUrl: 'https://api.blockdaemon.com/...', // Replace with actual Blockdaemon API URL
    apiKey: 'your-api-key',
}

const driver = new BlockdaemonSigningDriver(config)
```

### Features

The driver supports the following operations:

- **Key Management**:
    - `createKey`: Creates a new key pair on Blockdaemon.
    - `getKeys`: Retrieves a list of available keys.
- **Signing**:
    - `signTransaction`: Signs a transaction using a specified key.
- **Transaction Monitoring**:
    - `getTransaction`: Retrieves the status and details of a specific transaction.
    - `getTransactions`: Retrieves a list of transactions based on transaction IDs or public keys.
- **Configuration**:
    - `getConfiguration`: Returns the current configuration (masking sensitive secrets).
    - `setConfiguration`: Updates the driver's configuration at runtime.

### Integration

This driver is intended to be registered with the `SigningController` in the Wallet Gateway, which manages multiple signing providers.

```typescript
// Example integration (conceptual)
import { SigningController } from '@canton-network/core-signing-internal' // or similar

const signingController = new SigningController()
signingController.registerDriver(driver)
```

## Configuration

The driver accepts a `BlockdaemonConfig` object:

| Property  | Type     | Description                                   |
| :-------- | :------- | :-------------------------------------------- |
| `baseUrl` | `string` | The base URL for the Blockdaemon Signing API. |
| `apiKey`  | `string` | The API key for authentication.               |

### Wallet Gateway Configuration

When running the Wallet Gateway (Remote), configure non-secret settings in the
Gateway config. Listing `blockdaemon` under `signingProviders` opts the provider
in:

- `signingProviders.blockdaemon.baseUrl`: The base URL for the Blockdaemon API. Defaults to `http://localhost:5080/api/cwp/canton`.
- `signingProviders.blockdaemon.caip2`: The CAIP-2 network identifier. Defaults to `canton:testnet`.
- `signingProviders.blockdaemon.apiKeyEnv`: Name of the environment variable that holds the API key. Defaults to `BLOCKDAEMON_API_KEY`.

The API key value stays in that environment variable and is never stored in the config file.

If `signingProviders` is omitted, `BLOCKDAEMON_API_KEY`, `BLOCKDAEMON_API_URL`, and
`BLOCKDAEMON_CAIP2` are read from the environment. Non-secret variables are ignored once
`signingProviders` is present.

Example usage:

```json
{
    "signingProviders": {
        "blockdaemon": {
            "baseUrl": "https://api.blockdaemon.com/...",
            "caip2": "canton:testnet",
            "apiKeyEnv": "BLOCKDAEMON_API_KEY"
        }
    }
}
```

## License

Apache-2.0
