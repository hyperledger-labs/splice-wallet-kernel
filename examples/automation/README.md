# Wallet Gateway automations example

This example demonstrates how a **backend automation** submits Canton ledger transactions through the Wallet Gateway **without** a human clicking through the approval UI.

It is intentionally written in **Python** to show that service account automation is **language agnostic**: any HTTP client that can send JSON-RPC requests and an `Authorization: ApiKey …` header can integrate with the Gateway. The Wallet Gateway APIs are not tied to TypeScript or JavaScript.

## What this example does

1. Calls the dApp API `listAccounts` to verify API key authentication.
2. Calls `getPrimaryAccount` to read the primary wallet party ID.
3. Builds a simple **Ping** create command.
4. Calls `prepareExecute` with that command so the Gateway runs **prepare → sign → execute** straight through.

When the network is configured with `serviceAccountAuth` and the wallet uses participant signing, the transaction should complete during the `prepareExecute` call. For external signers (Fireblocks, Blockdaemon, Dfns), the transaction may stay `pending` until the custody provider approves and the Gateway signing worker finishes the flow.

## Prerequisites

Before running this script, complete the one-time setup described in [Service account automations](../../docs/wallet-gateway/automation/service-account-automations.mdx):

1. **Wallet Gateway** running locally (default `http://localhost:3030`) or pointing at your deployment.
2. **Network configuration** with `serviceAccountAuth` (`client_credentials`) on the target network.
3. **Logged-in user** with a **primary wallet** on that network.
4. **API key** created in the User UI or via User API `generateApiKey`.

## Configuration

Edit `main.py` and set:

| Variable    | Description                                                               |
| ----------- | ------------------------------------------------------------------------- |
| `API_KEY`   | API key from `generateApiKey` (shown only once at creation)               |
| `SUBMITTER` | Party ID to act as in the Ping command (must belong to the API key owner) |

## Run

This project uses [uv](https://docs.astral.sh/uv/getting-started/installation/) for dependency management:

```bash
cd examples/automation
uv run main.py
```

## API authentication

Automation requests use API key auth, not a user OAuth bearer token:

```http
Authorization: ApiKey <your-api-key>
```

The Gateway validates the key, associates the request with the key owner's wallets and network, and obtains a ledger access token using the network's `serviceAccountAuth` configuration.

Only the **dApp API** (`/api/v0/dapp`) accepts API key authentication. Create and revoke keys through the **User API** (`/api/v0/user`) while logged in with a normal user session.

## Expected output

On success you should see:

- Account listing from `listAccounts`
- The resolved primary party ID
- A `prepareExecute` response containing a `userUrl` (returned for API compatibility; automations typically ignore it and monitor `txChanged` events instead)
- The `transactionId` extracted from that URL

## Production notes

- Store API keys in environment variables or a secrets manager — do not commit them.
- Subscribe to dApp API **Server-Sent Events** (`txChanged`) for reliable completion notification, especially with external signing providers.
- See the full operations guide: [Service account automations](../../docs/wallet-gateway/automation/service-account-automations.mdx).

## Related documentation

- [Wallet Gateway automations](../../docs/wallet-gateway/automation/service-account-automations.mdx)
- [Wallet Gateway configuration](../../docs/wallet-gateway/operate/configure.mdx)
