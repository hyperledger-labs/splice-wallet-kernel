..
   Copyright (c) 2024 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
..
   SPDX-License-Identifier: Apache-2.0

.. #TODO: copy of https://raw.githubusercontent.com/hyperledger-labs/splice/3c0770e648b21a48ef8dde202ef27065592f9422/docs/src/deployment/traffic.rst

Tokenomics Fees and Rewards
===========================

Below is a high-level summary of the `Sycnrhonizer Traffic Fees page <https://docs.sync.global/deployment/traffic.html>`_ in the Splice Validator documentation.
For more detail on point, it's advised to read the that documenation.

Traffic
-------
* Traffic fees are paid at the validator node level, not the party level.
* Every validator has a traffic balance at the global synchronizer level.
    * Traffic is measured in bytes.
    * A trickle rate of free traffic is provided to validator nodes every 10 minutes (each mining round).
* Traffic is deducted from your validator node's traffic balance every time your node sends a message to the synchronizer. Traffic is charged for:
    * Broadcasting a transaction - this is where the bulk of the traffic fees will be paid.
    * Sending consensus messages for transactions a validator is involved in.
* If your node runs out of traffic it is unable to transact. It'll recover by itself thanks to the free trickle rate. However, you can buy more traffic. See the next section.


Getting more traffic
--------------------
* Traffic is obtained by burning Canton Coin and it is always pre-purchased.
* The conversion Canton Coin <> Bytes can be derived from on-chain parameters.
    * Super Validators publish an on-chain conversion CC <> USD.
    * Super Validators publish a traffic cost USD <> Bytes.
* Anyone can burn Canton Coin to get traffic for any node.
    * You can buy your own traffic.
    * You can sign up with a service like the `Denex Gas Station <https://denex.io/gasstation>`_ to buy your traffic.
* The validator node has automation to keep traffic topped up. As long as you keep CC in your validator party, it'll stay available. See `here <https://docs.sync.global/validator_operator/validator_helm.html#configuring-automatic-traffic-purchases>`_ for how to configure automatic traffic purchases.

Obtaining CC
------------
* The tokenomics of the network give you options for obtaining Canton Coin
* The tokenomics operate on 10m “mining rounds”. Every 10 minutes, different stakeholders of the network can mint Canton Coin according to how much value they've brought to the network. All rewards towards your node's internal parties will be auto-minted by your node.

*Ways of obtaining Canton Coin:*

* **Validator Liveness Rewards:** Just for being online and growing the network, the Canton Coin rules enable you to mint rewards.
* **Validator Activeness Rewards:** If you self-purchase traffic, you get a discount via these rewards.
* **Application Rewards:** If your application brings value to the network it can earn application rewards. Currently, the featured application rewards are oversized.

If the CC obtained by rewards are not sufficient, it's of course possible to buy CC in the open market to fund traffic.

Gaining Application Rewards as a Wallet/Custodian/Exchange
----------------------------------------------------------
* First: aim to get featured app status - this features a Party of yours, the “featured party”.
    * On DevNet you can self-feature through the wallet UI.
* As a fairly exclusive wallet/custodian, you can bill your customers in Canton Coin and get app rewards proportional to your customer base through this mechanism.
* If you have a broad customer base, you can construct the transfers to get application rewards for deposits and/or withdrawals. This is particularly easy if you activate direct/1-step transfers for deposits.


How to determine the traffic cost of a transaction?
---------------------------------------------------

Follow this `FAQ entry in the Splice documentation <https://docs.dev.sync.global/faq.html#term-How-do-I-determine-the-traffic-used-for-a-specific-transaction>`_.
