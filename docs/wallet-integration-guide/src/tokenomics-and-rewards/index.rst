..
   Copyright (c) 2024 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
..
   SPDX-License-Identifier: Apache-2.0

.. #TODO: copy of https://raw.githubusercontent.com/hyperledger-labs/splice/3c0770e648b21a48ef8dde202ef27065592f9422/docs/src/deployment/traffic.rst

.. _tokenomics-and-rewards:

Tokenomics and Rewards
======================

CC Rewards
----------
* The tokenomics operate on 10m “mining rounds”.
* Every 10 minutes, different stakeholders of the network are rewarded with coupons which can be used to mint Canton Coin according to how much value they've brought to the network.
* Coupons are rewarded to the Validator admin party.
* All rewards awarded to a node's local parties will be auto-minted by the node administrator party.
* The validators automation is not able to mint the rewards for an external parties - the external party needs to delegate the ability for the validator
  admin party to mint their rewards on their behalf or manually mint the rewards themselves each round they receive rewards.
* All rewards and coupons are mintable the follow mining round
* If rewards are not redeemed then they are lost*

You can find more information about the tokenomics of Canton Coin `here <https://docs.dev.sync.global/overview/overview.html#tokenomics>`_.

Ways of Obtaining Canton Coin Rewards
-------------------------------------
The tokenomics of the network give you options for obtaining Canton Coin:

Validator Liveness Rewards
^^^^^^^^^^^^^^^^^^^^^^^^^^
Just for being online and growing the network, Canton Coin tokenomics enable validator operators to mint CC.

Validator Activeness Rewards
^^^^^^^^^^^^^^^^^^^^^^^^^^^^
If you self-purchase traffic, you get a discount via these rewards.

Application Rewards and Featured Activity Markers
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. After the imminent CIP, Canton Coin transactions won't earn app rewards, just featured apps. See the below:
.. Transactions will only receive a weighting for featured app rewards where:
.. An approved featured app party is marked as the provider of a CC transfer or
.. A featured app marker contains an approved featured app party

**Application Rewards**
* Transactions which include Canton Coin and featured application transactions earn application rewards.
* The percentage of Canton Coin awarded to applications is significant and will grow over time.
* The current amount of CC awarded to applications can be seen in the 'Canton Coin Reward Split By Role Over Time' chart `here <https://canton.thetie.io/>`__.

**Featured application activity markers**
* Applications which generate valuable activity for the canton network, and have 'featured application' status can earn more application rewards.
* By applying a ``FeaturedAppActivityMarker`` to a transaction and qualifying as a Featured Application (apply `here <https://sync.global/featured-app-request/>`__) then you recieve a higher proportion of the application rewards.
* A weighting is applied to each transaction in that Canton Coin minting round.
* More weightings in a round equate to more application rewards.
* Currently, featured apps receive many more rewards in Canton Coin than the average transaction costs in traffic fees.

Gaining Application Rewards as a Wallet/Custodian/Exchange
----------------------------------------------------------
* Request featured application status. Apply `here <https://sync.global/featured-app-request/>`__.
    * On DevNet you can self-feature through the wallet UI.

**Enabling Pre-approval / 1-step Transfers**
* One way that wallets can earn app rewards is by enabling direct / 1 step / pre-approval transfers
* Setting up pre-approvals costs around $1 per 90 days per party
* By enabling 1-step transfers your party is added as the operator party to incoming deposits
* Therefore, when users deposit funds into your account you'll receive rewards.
* You can also mark transactions out of your wallet (that don't go to parties which have 1-step transfers enabled) with your party as the operator part for that transaction
* It's anticipated that you will receive far more Canton Coin through rewards for pre-approval deposits and transfers than you pay in traffic fees, setting up pre-approvals and for creating parties.
* Therefore:

  * You may not want to charge your users for traffic in the near term.
  * In the mid-to-long term the tokenomics may not support this model, so you may want to think about a charging strategy.
  * We still advise monitoring or even controlling the number of parties that a user can create so that you don't end up with users creating too many parties and therefore cost.

.. todo add a code example for adding app markers once we have this in the wallet SDK

Redeming Reward Coupons with External Party
-------------------------------------------
To accept rewards with an external party you need to call ``AmuletRules_Transfer`` with the activity records as inputs.

.. todo add code example once we have this in the wallet SDK

Sharing Featured Application Reward between multiple parties
------------------------------------------------------------
Featured Application rewards can be shared between multiple parties, this can be done by defining a list of benificiaries
and give them a weighted amount of the total reward. The sum of all beneficiaries weight must be equal to 1.0. This results
in separate coupons being generated for each beneficiary.

.. todo add code example once we have this in the wallet SDK
