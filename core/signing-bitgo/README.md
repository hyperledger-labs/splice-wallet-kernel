# BitGo Signing Driver

A driver for signing and retrieving Canton transactions using the BitGo TSS MPC custodial wallet API, implementing the `SigningDriverInterface` from `@canton-network/core-signing-lib`.

## How it works

BitGo signs Canton transactions asynchronously via its MPC TSS protocol:

1. **Key creation** — a BitGo custodial wallet is created per Canton party (`POST /api/v2/{coin}/wallet`). The returned `Key` carries the BitGo wallet ID as `id` (stable routing identifier) and the Ed25519 public key derived from the wallet keychain at `m/0` as `publicKey` (used for Canton party allocation and fingerprint generation).
2. **Sign request** — the Canton transaction is submitted as a message signing request (`POST /api/v2/wallet/{walletId}/msgrequests`) and returns a `txRequestId` immediately with status `pending`.
3. **Polling** — the wallet gateway polls `getTransaction(txRequestId)` until `status === 'signed'`. The Ed25519 signature and Canton signer fingerprint are extracted from the signed txRequest response.

## Credentials

1. Sign in to [BitGo](https://app.bitgo.com/) (or [BitGo Test](https://app.bitgo-test.com/) for testnet).
2. Create a **Long-Lived Access Token** in _User Settings → Developer Options → Access Tokens_. Select the scopes your use case requires (at minimum: wallet management and transaction signing).
3. Note your **Enterprise ID** from _Settings → Enterprise_. This is required for wallet creation.

## Environment variables

| Variable              | Required | Description                                                                                                                            |
| --------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `BITGO_ACCESS_TOKEN`  | Yes      | BitGo long-lived access token                                                                                                          |
| `BITGO_API_URL`       | No       | API base URL. Defaults to `https://app.bitgo.com` (prod). Use `https://app.bitgo-test.com` for testnet.                                |
| `BITGO_ENTERPRISE_ID` | No       | BitGo enterprise ID. Required for `createKey`. Enables restart-safe `getTransaction` fallback via the enterprise txrequests endpoint.  |
| `BITGO_COIN`          | No       | Canton coin identifier. Auto-detected: `tcanton` for `bitgo-test.com` URLs, `canton` for everything else (prod, proxies, custom URLs). |

## Transaction state lifecycle

BitGo signing is asynchronous — the MPC TSS protocol requires multiple internal rounds before a signature is produced. The driver maps BitGo states to Canton `SigningStatus`:

| BitGo state                                                                                                                                                   | Canton status | Notes                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| `initialized`, `pendingApproval`, `pendingDelivery`, `pendingUserSignature`, `pendingUserCommitment`, `pendingUserRShare`, `pendingUserGShare`, `readyToSend` | `pending`     | MPC rounds in progress                                                                                  |
| `messages[0].state === 'signed'`                                                                                                                              | `signed`      | Message-level state takes precedence — signing is complete even if txRequest is still `pendingDelivery` |
| `delivered`, `signed`                                                                                                                                         | `signed`      |                                                                                                         |
| `canceled`, `rejected`                                                                                                                                        | `rejected`    |                                                                                                         |
| `failed`                                                                                                                                                      | `failed`      |                                                                                                         |

## Restart resilience

The driver maintains in-memory caches for fast lookups (`txRequestId → walletId`, `publicKey ↔ walletId`). If the process restarts, these caches are empty. Transactions are recovered via the BitGo enterprise txrequests endpoint (requires `BITGO_ENTERPRISE_ID`). Public keys are resolved on demand per wallet via the BitGo wallet and keychain endpoints when not in cache.

## Development

```bash
pnpm build                                                   # compile
pnpm nx test @canton-network/core-signing-bitgo              # run tests
pnpm nx test @canton-network/core-signing-bitgo -c coverage  # with coverage report
```
