# Splice Wallet Kernel

## Project

### Short Description

Splice Wallet Kernel is a javascript & typescript based library that help facilitate communication between a Validator node, a canton developed dApp and a Walelt Provider.

### Dependent Projects

Splice Wallet Kernel is part of the Splice Ecosystem, that have grown out of the Daml blockchain ecosystem and its Canton protocol.

### Motivation

Splice Wallet Kernel aims to enable a transparent interaction between a dApp, Validator Node and a Wallet Provider. On public permissionless blockchains, a total state is shared amongst all nodes and as such, once a public key is shared the given counter party has full knowledge of your holdings, transactions history etc. Canton's unique approach to security and privacy result in fractured states shared amongst selected Validator nodes, and as such simply showing ownership of the associated private key does not present your entire financial data to a counter-party (in this example a dApp).

Spice Wallet Kernel aims to:

- Maintain the high-level of security and trust that lies in the Canton Protocol.
- Enable seamless communication between a dApp, Validator Node and Signature Provider, similar in experience to other blockchains.
- Provide transparency against malicious dApps, Validator Nodes or Signature Providers.
- Create a standardized communication framework, that allows anybody to extend or integrate with the Wallet Kernel.

### Status

The project is currently (2nd of June, 2025) in its infancy.

# Architecture

Folder Structure and usage

```
|-- api-specs               # Contains API Spec used for code generation
|   `-- ledger-api          # Contains API and websocket specs for all support ledger API versions
|-- clients                 # Contains the different clients of the wallet kernel
|   |-- extension               # Browser extension client
|   `-- remote                  # Remote RPC client
|-- core                    # Core components used for wallet kernel
|   |-- signing                # Contains Wallet Provider integrations for siging
|   |   |-- internal                # An implementation of an internal signing API
|   |   `-- lib                     # Generated code for the siging API
|   |-- rpc-generator           # Custom code for generation based on files in api-specs folder
|   |-- wallet-dapp-rpc-client  # Generated code for the dApp RPC client
|   |-- wallet-user-rpc-client  # Generated code for the user RPC client
|   |-- wallet-store            # Interface and implementation for the wallet store
|   `-- wallet-ui-components    # Various UI components stored for reusability between different clients
|-- docs                    # Documentations and readme files for the repo
|-- example                 # Example implementations
|-- scripts                 # Various scripts used for CI and development
`-- sdk                     # SDK bundling for the wallet kernel
```

The Above folder structure is an overview of where different independent components are located. Combined several of these components results in varius final release versions of the Wallet Kernel.

TODD: Define architecture of the project.

## Contributing

For information about contributing to the Splice Wallet Kernel, please refer to the [Contributing Guide](docs/CONTRIBUTING.md).

## Testing

TODO: Make Testing guide.
