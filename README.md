# Wallet Gateway

## Project

### Short Description

The Wallet Gateway repo contains two major components to help developers and integrators:

**Wallet Gateway:** Primary component of this repo, it is a javascript & typescript based library that help facilitate communication between a Validator node, a canton developed dApp and a Wallet Provider.

**Wallet SDK:** A Set of functionality to help Wallet Providers and Exchanges to quickly developed their workflows directly against ledger api.

### Dependent Projects

Wallet Gateway is part of the Splice Ecosystem, that have grown out of the Daml blockchain ecosystem and its Canton protocol.

### Motivation

Wallet Gateway aims to enable a transparent interaction between a dApp, Validator Node and a Wallet Provider. On public permissionless blockchains, a total state is shared amongst all nodes and as such, once a public key is shared the given counter-party has full knowledge of your holdings, transactions history etc. Canton's unique approach to security and privacy result in fractured states shared amongst selected Validator nodes, and as such simply showing ownership of the associated private key does not present your entire financial data to a counter-party (in this example a dApp).

**Wallet Gateway aims to:**

- Maintain the high-level of security and trust that lies in the Canton Protocol.
- Enable seamless communication between a dApp, Validator Node and Signature Provider, similar in experience to other blockchains.
- Provide transparency against malicious dApps, Validator Nodes or Signature Providers.
- Create a standardized communication framework, that allows anybody to extend or integrate with the Wallet Gateway.

**Wallet SDK aims to:**

- Make onboarding of multi-hosted external parties easy and efficient.
- Enable easy integration with Token Standard.
- Make integrating with Splice seamless, easy and efficient.

### Status

**The project is currently (1st of October, 2025) in active early development.**

Wallet Gateway is undergoing its final round of design before being built towards a finalized MVP.

Wallet SDK is building functionality to be feature complete and then bump to version 1.0.0.

## Contributing

For information about contributing to the repo, please refer to the [Contributing Guide](docs/CONTRIBUTING.md).

## Testing

TODO: Author a Testing guide.
