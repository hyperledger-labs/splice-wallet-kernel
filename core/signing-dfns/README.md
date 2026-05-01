# @canton-network/core-signing-dfns

This package provides a signing driver for integrating the Wallet Gateway with [Dfns](https://www.dfns.co/). It implements the `SigningDriverInterface` defined in `@canton-network/core-signing-lib`, allowing the Wallet Gateway to manage keys and sign transactions using Dfns's infrastructure.

## Installation

This package is part of the Splice Wallet Kernel monorepo and is typically installed as a workspace dependency.

```bash
yarn add @canton-network/core-signing-dfns
```

## Usage

The `DfnsSigningDriver` is designed to be used within the Wallet Gateway's signing architecture. It requires a configuration object containing Dfns organization details and credentials.

### Initialization

```typescript
import DfnsSigningDriver, {
    DfnsConfig,
    DfnsCredentials,
} from '@canton-network/core-signing-dfns'

const credentials: DfnsCredentials = {
    credId: 'your-credential-id',
    privateKey: 'your-private-key',
    authToken: 'your-auth-token',
}

const config: DfnsConfig = {
    orgId: 'your-dfns-org-id',
    baseUrl: 'https://api.dfns.io', // Dfns API URL
    credentials,
}

const driver = new DfnsSigningDriver(config)
```

### Features

The driver supports the following operations:

- **Key Management**:
    - `createKey`: Creates a new Canton wallet in Dfns.
    - `getKeys`: Retrieves a list of Canton wallets available in Dfns.
- **Signing**:
    - `signTransaction`: Signs a Canton transaction using a specified wallet.
- **Transaction Monitoring**:
    - `getTransaction`: Retrieves the status and details of a specific transaction.
    - `getTransactions`: Retrieves a list of transactions based on transaction IDs or public keys.
- **Configuration**:
    - `getConfiguration`: Returns the current configuration.
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

The driver accepts a `DfnsConfig` object:

| Property      | Type              | Required | Description                                                  |
| :------------ | :---------------- | :------- | :----------------------------------------------------------- |
| `orgId`       | `string`          | Yes      | Your Dfns organization ID.                                   |
| `baseUrl`     | `string`          | Yes      | The base URL for the Dfns API (e.g., `https://api.dfns.io`). |
| `credentials` | `DfnsCredentials` | Yes      | Credentials used to authenticate with Dfns.                  |

### DfnsCredentials

Each credential object contains:

| Property     | Type     | Description                                |
| :----------- | :------- | :----------------------------------------- |
| `credId`     | `string` | The Dfns credential ID.                    |
| `privateKey` | `string` | The private key for signing API requests.  |
| `authToken`  | `string` | The authentication token for the Dfns API. |

### Wallet Gateway Configuration

When running the Wallet Gateway (Remote), the Dfns signing driver is configured using the following environment variables:

- `DFNS_ORG_ID`: Your Dfns organization ID.
- `DFNS_BASE_URL`: The base URL for the Dfns API. Defaults to `https://api.dfns.io` if not set.
- `DFNS_CRED_ID`: The default credential ID for Dfns API authentication.
- `DFNS_PRIVATE_KEY`: The private key for signing Dfns API requests.
- `DFNS_AUTH_TOKEN`: The authentication token for the Dfns API.

Example usage:

```bash
DFNS_ORG_ID="your-org-id" \
DFNS_BASE_URL="https://api.dfns.io" \
DFNS_CRED_ID="your-cred-id" \
DFNS_PRIVATE_KEY="your-private-key" \
DFNS_AUTH_TOKEN="your-auth-token" \
yarn start
```

## Canton Network Support

The Dfns signing driver filters for Canton and CantonTestnet wallets only. Wallets must be:

- Created in Dfns with network type `Canton` or `CantonTestnet`
- In `Active` status with a valid address

## License

Apache-2.0
