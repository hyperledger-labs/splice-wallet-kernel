.. _dapp-sdk:

dApp SDK
========

The dApp SDK is a TypeScript library for building decentralized applications on the Canton Network. It provides a high-level interface for connecting to Canton wallets, managing accounts, signing messages, and executing transactions.

The SDK implements the dApp API as defined in `CIP-0103 <https://github.com/canton-foundation/cips/blob/main/cip-0103/cip-0103.md>`_, establishing a vendor-neutral standard that enables any dApp to interoperate with any Canton-compatible wallet.

.. rubric:: Overview

The dApp SDK decouples your application from wallet implementations, allowing users to choose their preferred wallet and signing provider. The SDK handles:

- **Wallet Connectivity** - Connect, disconnect, and monitor connection status
- **Account Management** - List accounts, get the primary account, and respond to account changes
- **Transaction Signing** - Request user approval and signatures for Daml transactions
- **Message Signing** - Sign arbitrary messages for authentication or verification
- **Ledger API Access** - Proxy authenticated requests to the Canton JSON Ledger API
- **Real-time Events** - Subscribe to status changes, account changes, and transaction lifecycle events

.. rubric:: Architecture

The SDK provides two levels of abstraction:

1. **dApp SDK** (recommended) - High-level methods like ``sdk.connect()``, ``sdk.listAccounts()``, and ``sdk.prepareExecute()`` for common operations
2. **Provider API** - Low-level `EIP-1193 <https://eips.ethereum.org/EIPS/eip-1193>`_-compatible interface using ``provider.request({ method, params })`` for direct API access

Both interfaces work with the same underlying dApp API, so you can mix and match as needed.

.. rubric:: Transport Support

The SDK supports multiple transport mechanisms to connect to different wallet types:

- **postMessage** - For browser extension wallets that inject a provider into the page
- **HTTP/SSE** - For remote wallets and server-side wallet gateways

The SDK automatically handles the transport layer, allowing your dApp to work with both local and remote wallets without code changes.

.. rubric:: Provider Discovery

When using browser extension wallets, the SDK exposes an EIP-1193-compatible provider at ``window.canton``, following the pattern established by Ethereum wallets. This enables wallet discovery and connection in browser environments.

.. toctree::
   :maxdepth: 2
   :caption: Contents:

   installation
   usage
   api-reference
   best-practices
