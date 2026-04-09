## Summary

Adds WalletConnect transport support to the dApp SDK, enabling dApps to connect to Canton wallets over the WalletConnect v2 relay. Includes a standalone wallet example app that acts as the WalletKit counterpart.

### Architecture

```mermaid
graph LR
    subgraph dApp
        SDK[dApp SDK + SignClient]
    end

    subgraph WCRelay
        WC[Encrypted relay]
    end

    subgraph WalletExample
        WK[WalletKit]
        Handler[Request Handler]
    end

    subgraph WalletGateway
        API[dApp API / User API]
    end

    subgraph Canton
        Ledger[Ledger API]
    end

    SDK -- canton methods --> WC
    WC -- session_request --> WK
    WK --> Handler
    Handler -- JSON-RPC --> API
    API -- Bearer JWT --> Ledger
```

### Request flow

```mermaid
sequenceDiagram
    participant dApp
    participant Relay as WC Relay
    participant Wallet as Wallet Example
    participant GW as Gateway
    participant L as Ledger API

    dApp->>Relay: canton_prepareSignExecute
    Relay->>Wallet: session_request

    alt Read-only
        Wallet->>GW: forward immediately
    else Mutating
        Wallet-->>Wallet: queue for user approval
        Note over Wallet: User clicks Approve
    end

    Wallet->>GW: prepareExecute
    GW->>L: prepare + sign + execute
    L-->>GW: completion
    GW-->>Wallet: result
    Wallet->>Relay: respond
    Relay->>dApp: executed result
```

### WC protocol spec

| SDK method              | Wire method                 | Approval |
| ----------------------- | --------------------------- | -------- |
| `prepareExecute`        | `canton_prepareSignExecute` | Manual   |
| `prepareExecuteAndWait` | `canton_prepareSignExecute` | Manual   |
| `ledgerApi`             | `canton_ledgerApi`          | Auto     |
| `listAccounts`          | `canton_listAccounts`       | Auto     |
| `getPrimaryAccount`     | `canton_getPrimaryAccount`  | Auto     |
| `getActiveNetwork`      | `canton_getActiveNetwork`   | Auto     |
| `status`                | `canton_status`             | Auto     |
| `signMessage`           | `canton_signMessage`        | Manual   |

- `connect` / `disconnect` are handled locally and never sent over the relay
- Both `prepareExecute` and `prepareExecuteAndWait` collapse into `canton_prepareSignExecute` - the wallet does the full prepare-sign-execute cycle
- Events: `accountsChanged`, `statusChanged` via session_event; `session_delete` is a built-in WC event

## Changes

### sdk/dapp-sdk

- **WalletConnectAdapter** - single class implementing both `ProviderAdapter` and `Provider<DappRpcTypes>`. Calls `signClient.request()` directly with `canton_` prefix. No intermediate transport or RPC client layers.
- **DappSDK** - adds `walletConnectProjectId` option, `getWalletConnectSessions()` for session restore, auto-registers the WC adapter when a project ID is provided.
- **sdk-controller** - relaxed type from `DappAsyncProvider` to `Provider<DappAsyncRpcTypes>` so the WC adapter can reuse it.

### examples/wallet (new)

Standalone React app on port 8082 that acts as a WalletConnect wallet:

- WalletKit initialization and session management
- Auto-dispatch for read-only methods (status, ledgerApi, listAccounts, etc.)
- Manual approval UI for `canton_prepareSignExecute` and `canton_signMessage`
- Session proposals with network selection
- Full prepare + sign + execute flow via the gateway dApp and User APIs
- Dashboard with wallet info, active sessions, pairing input

### examples/ping

- Adds `walletConnectProjectId` to connect options
- Session restore via `getWalletConnectSessions()` on mount

### examples/portfolio

- **Fixed disconnect handling**: split the single mount effect into two effects (matching the ping example pattern) so `onStatusChanged` is registered after connection, not buried in a `.then()` chain that never executes on fresh loads
- Adds `walletConnectProjectId` to connect options
- Session restore via `getWalletConnectSessions()` on mount

### core/wallet-ui-components

- Wallet picker handles `wc-uri` postMessage to display the WC URI for copy/paste pairing

## Test plan

- [ ] Ping + WalletConnect: start Canton, Gateway, Wallet Example, Ping. Connect via WC, create Ping contract, verify transaction appears
- [ ] Portfolio + WalletConnect: connect via WC, verify holdings load, disconnect from wallet side, verify portfolio resets cleanly
- [ ] Session restore: connect via WC, refresh dApp page, verify session is restored without re-pairing
- [ ] Wallet-side disconnect: connect, disconnect from wallet example, verify dApp resets to disconnected state
- [ ] dApp-side disconnect: connect, disconnect from dApp settings, verify wallet example shows session removed
- [ ] Existing flows: verify HTTP gateway connection still works for both ping and portfolio
