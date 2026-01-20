dApp SDK
========

This SDK is for 3rd-party dApps developed against the Canton Network.
It's intended to be used in a browser to securely connect users to Canton Network wallets.
Once connected, the SDK provides a dApp UI with permissions to read a user's selected Canton party and request transaction signatures.

The dApp SDK builds on the reference dApp API defined in CIP-TBD.
This extension to the Ledger API establishes a standard interface for decentralized applications (dApps) on the Canton Network,
enabling dApp developers to interact with any Canton Network–compatible Web3 wallet through a unified API and SDK.

**Additional features of the dApp SDK:**

- Multi-Transport Support: `postMessage` (Browser Extension Wallets), `HTTP` (Remote Wallets)

- EIP-1193 provider: `window.canton`


.. toctree::
   :maxdepth: 2
   :caption: Contents:

   installation
   usage
   api-reference
   best-practices

