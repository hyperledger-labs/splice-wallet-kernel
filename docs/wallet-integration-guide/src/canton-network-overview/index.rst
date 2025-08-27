Canton Network Overview
=======================

High-level Overview
-------------------

Canton Network is a public layer 1 blockchain network with privacy. It is designed for financial institutions and DeFi alike to facilitate secure, interoperable, and privacy-preserving transactions and drive the confluence of TradFi and DeFi.

Key Features:

* It uniquely balances the decentralization of public blockchains with the privacy and controls required for financial markets.
* It enables real-time, secure synchronization and settlement across multiple asset classes on a shared, interoperable infrastructure.
* It allows assets and data to move across applications with real-time synchronization and guaranteed privacy.

**Technology:** The Canton Network is designed as a "network of networks," where each participating institution maintains its own sub-ledger 
while connecting with others via a shared synchronization layer.
**Governance:** The Global Synchronizer Foundation (GSF), an independent, non-profit body under the Linux Foundation, governs the global synchronizer.
**Participants:** Canton Network was launched in May 2023 by a group of major institutions, and continues to be backed by the world's 
largest financial and crypto institutions alike. Participants include Goldman Sachs, HSBC and BNP Paribas, market infrastructure providers 
like DTCC and Deutsche Börse, and (crypto) trading firms like DRW and QCP.

Canton's High-level architecture
---------------------
Nodes and Consensus
^^^^^^^^^^^^^^^^^^^
The Canton network is composed of nodes known as **validators** that achieve consensus through **synchronizers**. 
Validator nodes are responsible for storing contract data and executing smart contract code. 
The synchronizers, in turn, distribute encrypted messages and facilitate transaction coordination. 
Transaction data is only distributed on a **need-to-know basis** to maintain confidentiality. This is the key delta to other chains:

* In most other chains, all state and transactions get replicated to all nodes/validators.
* In Canton, state and transactions get distributed only to nodes/validators that are specified in the smart contracts.

.. _parties:
Parties
^^^^^^^
In Canton, **parties** are the core on-ledger identities, and are the wallet addresses, similar to an address or Externally Owned Account 
(EOA) on other blockchains. They are central to how **permissions** and **privacy** are managed within the network.

**Party Permissions and Roles**

Smart contracts specify permissions for different parties, dictating what they can and can't do. Depending on their role, parties:

* **Validate** specific transactions, such as a transfer of assets.
* **Control** certain actions, like initiating transfers.
* **See** specific state and transactions, such as a record of their holdings.

Privacy is maintained at the party level, meaning transaction and state data is only shared with the parties who need to see it, 
ensuring a high degree of confidentiality.

**Local parties vs External parties**

Parties come in two forms, internal and external.
An internal party is created on the validator node, it gives a validator node submission rights and therefore holds its key on the validator node.
Transactions are signed using the Validators own internal keys for signing (and thereby the validator operator has full control of everything that happens on the party).

External parties are similar to how node interactions happens on other networks and therefore Externally Owned Accounts.
In this case the signing key can be held externally and a signature is required alongside the transaction to authorize the action. 
For external parties the base flow follows three steps: Prepare a transaction, sign the transaction and submit the transaction.
In this guide, when a party is referenced, it is referring to an external party unless otherwise specified.

To read more about the differences between internal and external parties, see the `Local and external parties documentation section here <https://docs.digitalasset.com/overview/3.3/explanations/canton/external-party.html#overview-canton-external-parties/>`__.

**Onboarding and Format**

Parties are formatted as ``name::fingerprint``, where the **fingerprint** is a unique identifier which can be generated from a public key (and thus also from a private key).
The fingerprint is a sha256 hash of the public key prefixed with '12' (as indicated by the `hash purpose <https://github.com/digital-asset/canton/blob/8ee65155e7f866e1f420703c376c867336b75088/community/base/src/main/scala/com/digitalasset/canton/crypto/HashPurpose.scala#L63>`_).

To use a party, you must **onboard** it by submitting a topology transaction that authorizes a node to host it. 
The designated node must then submit a matching transaction to officially accept the hosting request. Instructions on how to do that can be found here.
.. TODO: Add link to 'here'

**Party Hosting**

Since not every user wants to host a node, parties are associated with validator nodes. These validators "host" parties by:
* Storing the party's private data and making it available through an RPC (Remote Procedure Call) interface.
* Participating in consensus on the party's behalf.

Crucially, even though a validator hosts a party, the party retains ultimate control by holding its own independent **signing keys** externally to the participant.

To participate in the network, a party must designate one or more validator nodes to host their data. This relationship, 
known as **Party Hosting**, is established through a **topology transaction**.
.. TODO: Add link to topology transaction

Consequences & Implications
^^^^^^^^^^^^^^^^^^^^^^^^^^^
**Reading Data and Validator State**

A key implication of Canton's architecture for providing privacy, is how you read data. Unlike other blockchains where nodes are often ephemeral and 
interchangeable, in Canton, **validators have state**. This means that to access a party's or user's data, you must specifically connect to 
the **validator that hosts that party**. There is no single, all-encompassing blockchain RPC endpoint you can call to retrieve all data. 
Instead, you'll need to use your node's RPC for private data ("Ledger API") and potentially an app provider's API for their data (e.g., a "Scan API").

**Advantages and Consequences**

The design of the Canton Network leads to several significant advantages:

* **Privacy:** It enables true confidentiality at the smart contract level, as data is only distributed to the parties who have a legitimate need to see it.
* **Light Node Footprint:** Nodes only process their own transactions, not the entire network's, which keeps them lightweight and efficient.
* **Scalability:** The network can be scaled by simply adding more nodes.

However, this architecture has the consequence of decentralized data access, as previously mentioned.

.. _implications-for-wallet-providers:

**Implications for Wallet Providers**

To offer services on the Canton Network, you will need a **validator node to host your parties and your customers' parties**.
You have two options for this: you can **self-host** a node or use a `node-as-a-service provider <https://sync.global/current-validators-offering-nodes/>`__.

For **wallets and custodians**, this means your role extends beyond just safekeeping assets; you are also responsible for 
**safekeeping your customers' data** and preserving their privacy.

The Canton Network is designed to be agile and undergoes frequent upgrades. Node operators are asked to run nodes in three different environments: 
**DevNet, TestNet, and MainNet** to ensure that applications and integrations can be tested with new network upgrades. If you choose to self-host, 
be prepared to spin up and maintain nodes for all three environments. 
To stay informed and get support, it's highly recommended that self-hosting node operators join the validator node operator community on Slack.