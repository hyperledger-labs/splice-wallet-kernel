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

- [Overview](dapp-sdk/overview.md) — How the SDK, CIP-103 provider, adapters, and wallets fit together
- [Quickstart](dapp-sdk/quickstart.md) — Install, connect a wallet, read the primary party, and submit a transaction
- Guides
    - [Wallet discovery](dapp-sdk/guides/wallet-discovery.md)
    - [Connect & sessions](dapp-sdk/guides/connect-and-sessions.md)
    - [Parties & transactions](dapp-sdk/guides/parties-and-transactions.md)
    - [Handle events](dapp-sdk/guides/handle-events.md)
- [SDK methods](dapp-sdk/reference/sdk-methods.md)
- [Provider API](dapp-sdk/reference/provider-api.md)
- Wallet providers
    - [Integration overview](dapp-sdk/wallet-providers/integration-overview.md) — How wallets and extensions appear in the SDK picker
    - [Browser extension](dapp-sdk/wallet-providers/browser-extension.md)
    - [Remote wallet](dapp-sdk/wallet-providers/remote-wallet.md)
    - [WalletConnect](dapp-sdk/wallet-providers/walletconnect.md)

**Audience:** Frontend developers building dApps that connect users to Canton wallets. Start here if you want to call `connect()`, list accounts, or prepare and execute transactions.

---

### Wallet Gateway

**Published:** [NPM](https://www.npmjs.com/package/@canton-network/dapp-sdk), [Docker](https://github.com/digital-asset/wallet-gateway/pkgs/container/wallet-gateway%2Fdocker%2Fwallet-gateway), [Helm](https://github.com/digital-asset/wallet-gateway/pkgs/container/wallet-gateway%2Fhelm%2Fwallet-gateway)
**Path:** [`wallet-gateway/`](wallet-gateway/)

For developers **running or configuring** the Wallet Gateway server that mediates between dApps, Canton validators, and signing providers.

**Contents:**

- [Overview](wallet-gateway/index.md)
- [Quickstart](wallet-gateway/quickstart.md)
- Set up and operate
    - [Configure the Wallet Gateway](wallet-gateway/operate/configure.md)
    - [Networks and identity providers](wallet-gateway/operate/networks-and-identity.md)
    - [Signing providers](wallet-gateway/operate/signing-providers.md)
    - [Deploy](wallet-gateway/operate/deploy.md)
    - [Security checklist](wallet-gateway/operate/security.md)
    - [Troubleshooting](wallet-gateway/operate/troubleshooting.md)
- Use the Wallet Gateway
    - [Party management](wallet-gateway/use/party-management.md)
    - [Approve and sign transactions](wallet-gateway/use/approve-and-sign.md)
- Automation
    - [Automate with the User API](wallet-gateway/automation/automate-with-user-api.md)
    - [Service account automations](wallet-gateway/automation/service-account-automations.md)
- Reference
    - [Configuration reference](wallet-gateway/reference/configuration-reference.md)
    - [dApp API](wallet-gateway/reference/dapp-api.md)
    - [User API](wallet-gateway/reference/user-api.md)

**Audience:** Operators and backend developers deploying the Wallet Gateway or integrating it with signing providers and identity systems.

---

### Wallet Integration Guide

**Published:** [docs.canton.network](https://docs.canton.network/sdks-tools/sdks/wallet-sdk/overview)
**Path:** [`wallet-integration-guide/`](wallet-integration-guide/)

For **wallet providers, exchanges, and custodians** integrating directly with the Canton Network. Covers lower-level topics from party management and transaction signing through to transfers and Wallet SDK configuration.

**Topics covered:**

| Section                                   | Description                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| **Canton Network Overview**               | Network topology, synchronizers, participants                             |
| **Integrating with the Canton Network**   | Necessary and optional wallet features, hosting a validator               |
| **USDCx Support**                         | USDCx-specific integration notes                                          |
| **Proof of Transfer**                     | Proving a transfer happened                                               |
| **Memo Tags**                             | Routing deposits to accounts at exchanges                                 |
| **Wallet SDK Overview and Configuration** | Configuring the `@canton-network/wallet-sdk`, registering plugins         |
| **Creating an External Party**            | Creating and onboarding external parties with key pairs                   |
| **Finding and Reading Data**              | Querying parties, active contracts and ledger state                       |
| **Preparing and Signing a Transaction**   | Interactive submission flow, transaction hashing, signatures              |
| **Signing Transactions from dApps**       | End-to-end flow when a dApp requests a signature                          |
| **Transfer Types and CC Tap**             | Two-step and one-step transfers, preapprovals, tapping on DevNet/LocalNet |
| **User Management**                       | Creating users and granting rights                                        |
| **v0 to v1 Migration Guide**              | Moving from the v0 controllers to the v1 namespaces, with a cheat sheet   |
| **Release Notes**                         | Version history and breaking changes (`src/release-notes/index.rst`)      |

**Audience:** Teams building custodial wallets, exchange integrations, or any backend that talks directly to the Canton Ledger API. The guide recommends using the Wallet SDK but also documents raw API usage.

**Format:** Markdown. Code samples are not copied into the pages: a link to the tested file in `examples/`, followed by an include comment (`<!-- include -->`), marks where the sync with the central docs repository (`canton-network/cf-docs`, see `docs/docs-sync.json`) inserts the code. `pnpm docs:check-includes` checks that the linked files exist (CI does this).

`src/release-notes/index.rst` is kept as reStructuredText because the central docs repository reads it to generate the Wallet SDK release notes.

The guide includes runnable TypeScript examples under [`wallet-integration-guide/examples/`](wallet-integration-guide/examples/).

---

## Reference Documents

| File                               | Description                                                           |
| ---------------------------------- | --------------------------------------------------------------------- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute to the project (branching, PRs, code review)        |
| [CLEANCODING.md](CLEANCODING.md)   | Clean coding guidelines and conventions                               |
| [GLOSSARY.md](GLOSSARY.md)         | Terminology reference for Canton, Splice, and Wallet Gateway concepts |
| [RELEASES.md](RELEASES.md)         | Release process and versioning policy                                 |
