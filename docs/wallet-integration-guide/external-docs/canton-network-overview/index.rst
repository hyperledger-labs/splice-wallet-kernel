Canton Network Overview
=======================

High-level Overview
-------------------

Canton Network is a public layer 1 blockchain network with privacy. It is designed for financial institutions and DeFi alike to facilitate secure, interoperable, and privacy-preserving transactions and drive the confluence of TradFi and DeFi. 

Key Features:
* It uniquely balances the decentralization of public blockchains with the privacy and controls required for financial markets.
* It enables real-time, secure synchronization and settlement across multiple asset classes on a shared, interoperable infrastructure.
* It allows assets and data to move across applications with real-time synchronization and guaranteed privacy.
**Technology:** The Canton Network is designed as a "network of networks," where each participating institution maintains its own sub-ledger while connecting with others via a shared synchronization layer.
**Governance:** The Global Synchronizer Foundation (GSF), an independent, non-profit body under the Linux Foundation, governs the global synchronizer.
**Participants:** Canton Network was launched in May 2023 by a group of major institutions, and continues to be backed by the world's largest financial and crypto institutions alike. Participants include Goldman Sachs, HSBC and BNP Paribas, market infrastructure providers like DTCC and Deutsche Börse, and (crypto) trading firms like DRW and QCP.

Canton's Architecture
---------------------
Expand on the below:

* Nodes run consensus via synchronizers.
* Synchronizers distribute encrypted messages.
* Tx data is distributed on a need to know basis.
* Thus wallets are associated with nodes - they are “hosted”.
* You have to get the data for a wallet from a node hosting that wallet.
* As a wallet provider/exchange you therefore need to run a node - a validator node to be precise.
  * Because the network upgrades regularly, the node operator community asks that you run nodes in all three environments, DevNet, TestNet, and MainNet.
  * There are multiple node as a service providers that can provide a node to you.

Parties
-------
Expand on the below:
* Wallets in Canton are called parties. These are equivalent to addresses in other chains.
* They have this format: name::fingerprint.
* You can generate the fingerprint from a private key.
* To use a party, you have to onboard it, which includes setting up the party hosting.
* To authorize a node to host a party, you need a “topology transaction” that says “this node may host my private data and participate in consensus for my wallet”.
* The node needs to write a matching transaction that says “I'm happy to host that wallet”.

Smart Contracts
---------------
Expand on the below:
* Canton smart contracts are UTXO based.
* UTXOs are typed and have annotations which determine who validates transactions acting on them, who sees them, and who can act on them. These annotations are Parties, and via the hosting relationship determines which nodes are involved in transactions.
* The types of UTXOs are from smart contract packages distributed as DAR files. To interact with a smart contract, a node needs to install the smart contract code.
* All nodes come pre-installed with the code for Canton Coin.

Token Standard Tokens
---------------------
Expand on the below
* Every token in canton has a special wallet associated with it called the “admin” or sometimes “registry” of that token. It’s the wallets that created the mint for that token.
* By default, tokens in Canton have two types of UTXOs:
  * Holdings
    * Validated by and visible to the owner and the admin parties.
    * Controlled by the owner party.
    * Transferable to a new owner with their authorization.
  * Reference data
    * Validated by and visible to the admin party.
    * Shared with wallets/owners through regular APIs.
* Thus the admin sees the entire state of a given token.
* Owners see their holdings in all tokens.
* To display the holdings for a specific owner, wallets must query a node which hosts that owner..
* Thus as a wallet provider/exchange you use your node for most read operations.
