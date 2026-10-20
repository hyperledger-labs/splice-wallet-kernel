# Documentation

This directory contains developer guides and supporting reference documents for the Wallet Gateway project.

> [!NOTE]
> Migration guides for each release are published in [Discussions](https://github.com/canton-network/wallet/discussions).

## Guides

### dApp SDK

**Published:** [NPM](https://www.npmjs.com/package/@canton-network/dapp-sdk)
**Path:** [`dapp-sdk/`](dapp-sdk/)

For **dApp developers** integrating `@canton-network/dapp-sdk` to discover wallets, connect users, read parties, request signatures, and submit transactions.

**Contents:**

- [Overview](dapp-sdk/overview.mdx) — How the SDK, CIP-103 provider, adapters, and wallets fit together
- [Quickstart](dapp-sdk/quickstart.mdx) — Install, connect a wallet, read the primary party, and submit a transaction
- Guides
    - [Wallet discovery](dapp-sdk/guides/wallet-discovery.mdx)
    - [Connect & sessions](dapp-sdk/guides/connect-and-sessions.mdx)
    - [Parties & transactions](dapp-sdk/guides/parties-and-transactions.mdx)
    - [Handle events](dapp-sdk/guides/handle-events.mdx)
- [SDK methods](dapp-sdk/reference/sdk-methods.mdx)
- [Provider API](dapp-sdk/reference/provider-api.mdx)
- Wallet providers
    - [Integration overview](dapp-sdk/wallet-providers/integration-overview.mdx) — How wallets and extensions appear in the SDK picker
    - [Browser extension](dapp-sdk/wallet-providers/browser-extension.mdx)
    - [Remote wallet](dapp-sdk/wallet-providers/remote-wallet.mdx)
    - [WalletConnect](dapp-sdk/wallet-providers/walletconnect.mdx)

**Audience:** Frontend developers building dApps that connect users to Canton wallets. Start here if you want to call `connect()`, list accounts, or prepare and execute transactions.

---

### Wallet Gateway

**Published:** [NPM](https://www.npmjs.com/package/@canton-network/dapp-sdk), [Docker](https://github.com/digital-asset/wallet-gateway/pkgs/container/wallet-gateway%2Fdocker%2Fwallet-gateway), [Helm](https://github.com/digital-asset/wallet-gateway/pkgs/container/wallet-gateway%2Fhelm%2Fwallet-gateway)
**Path:** [`wallet-gateway/`](wallet-gateway/)

For developers **running or configuring** the Wallet Gateway server that mediates between dApps, Canton validators, and signing providers.

**Contents:**

- [Overview](wallet-gateway/index.mdx)
- [Quickstart](wallet-gateway/quickstart.mdx)
- Set up and operate
    - [Configure the Wallet Gateway](wallet-gateway/operate/configure.mdx)
    - [Networks and identity providers](wallet-gateway/operate/networks-and-identity.mdx)
    - [Signing providers](wallet-gateway/operate/signing-providers.mdx)
    - [Deploy](wallet-gateway/operate/deploy.mdx)
    - [Security checklist](wallet-gateway/operate/security.mdx)
    - [Troubleshooting](wallet-gateway/operate/troubleshooting.mdx)
- Use the Wallet Gateway
    - [Party management](wallet-gateway/use/party-management.mdx)
    - [Approve and sign transactions](wallet-gateway/use/approve-and-sign.mdx)
- Automation
    - [Automate with the User API](wallet-gateway/automation/automate-with-user-api.mdx)
    - [Service account automations](wallet-gateway/automation/service-account-automations.mdx)
- Reference
    - [Configuration reference](wallet-gateway/reference/configuration-reference.mdx)
    - [dApp API](wallet-gateway/reference/dapp-api.mdx)
    - [User API](wallet-gateway/reference/user-api.mdx)

**Audience:** Operators and backend developers deploying the Wallet Gateway or integrating it with signing providers and identity systems.

---

### Wallet Integration Guide

**Published:** [docs.digitalasset.com](https://docs.digitalasset.com/integrate/devnet/index.html)
**Path:** [`wallet-integration-guide/`](wallet-integration-guide/)

For **wallet providers, exchanges, and custodians** integrating directly with the Canton Network. Covers lower-level topics from party management and transaction signing through to exchange-specific workflows.

**Topics covered:**

| Section                                | Description                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| **Canton Network Overview**            | Network topology, synchronizers, participants                                      |
| **Integrating with Canton Network**    | Connection setup, authentication, environment configuration                        |
| **Party Management**                   | Creating and managing external parties with keypairs                               |
| **Finding and Reading Data**           | Querying active contracts and ledger state                                         |
| **Preparing and Signing Transactions** | Interactive submission flow, transaction hashing, signature formats                |
| **Signing Transactions from dApps**    | End-to-end flow when a dApp requests a signature through the Wallet Gateway        |
| **Token Standard**                     | Canton Token Standard (CTS) contracts, transfers, holdings                         |
| **Wallet SDK Configuration**           | Configuring the `@canton-network/wallet-sdk`                                       |
| **Traffic**                            | Traffic management and rate limiting                                               |
| **Tokenomics and Rewards**             | Reward mechanisms and validator economics                                          |
| **User Management**                    | Identity providers, user rights, multi-tenancy                                     |
| **Canton Coin Considerations**         | Canton Coin-specific implementation details                                        |
| **Deposits into Exchanges**            | Deposit detection, reconciliation patterns                                         |
| **USDCx Support**                      | USDCx-specific integration notes                                                   |
| **Exchange Integration**               | Full exchange architecture, workflows, testing, disaster recovery, node operations |
| **Release Notes**                      | Version history and breaking changes                                               |

**Audience:** Teams building custodial wallets, exchange integrations, or any backend that talks directly to the Canton Ledger API. The guide recommends using the Wallet SDK but also documents raw API usage.

**Preview locally:**

This project uses [uv](https://docs.astral.sh/uv/getting-started/installation/) for dependency management:

```bash
cd docs/wallet-integration-guide
uv run sphinx-autobuild -c . src build -W
```

The guide includes runnable TypeScript examples under [`wallet-integration-guide/examples/`](wallet-integration-guide/examples/).

---

## Reference Documents

| File                               | Description                                                           |
| ---------------------------------- | --------------------------------------------------------------------- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute to the project (branching, PRs, code review)        |
| [CLEANCODING.md](CLEANCODING.md)   | Clean coding guidelines and conventions                               |
| [GLOSSARY.md](GLOSSARY.md)         | Terminology reference for Canton, Splice, and Wallet Gateway concepts |
| [RELEASES.md](RELEASES.md)         | Release process and versioning policy                                 |
