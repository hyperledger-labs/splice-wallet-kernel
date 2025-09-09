.. _exchange-integration-overview:

Overview
========

This guide aims to help you integrate your exchange with Canton
for the purpose of trading Canton Coin (CC) and Canton Network (CN) tokens.

What is the status of this guide?
---------------------------------

The guide is under active development with new content being added daily.
Here are some things you can do with it in its current state:

* Review the :ref:`recommended architecture <integration-architecture>` and compare it to your existing
  integration architecture for UTXO-based chains.
* Understand how deposits and withdrawals work by reading the :ref:`integration-workflows` section.
* Get a feel for the overall integration project
  by browsing the :ref:`table of contents <exchange-integration>`
  and the sketches of the incomplete sections.


What to develop in what order?
------------------------------

This material is comprehensive guidance for integrating
with the Canton Network. You may need to review it several times to become familiar with Canton's UTXO-based chain,
smart contract language, and its privacy model.

The guide is intentionally structured such that you can use a learning-by-doing approach
that delivers your integration in a series of incremental milestones:

* Canton Coin (CC)  with 1-step withdrawal only.
* Support for all CN Tokens, not just CC.
* Earning additional application rewards for all CN tokens.

The following dependency diagrams shows the work items for each milestone.

.. image:: images/delivery_dependencies.png
  :alt: milestone and delivery dependency diagram

**CC with 1-step withdrawal only**: this milestone allows you to support deposits and withdrawals of CC.
It includes earning app rewards for all CC deposits.
The workflows build on the `Canton Network Token Standard <https://docs.dev.sync.global/app_dev/token_standard/index.html>`__ which is the foundation for
supporting all CN tokens in the next milestone.
We consider it an intermediate milestone, as it does not support:

* all CN tokens
* CC users that prefer to control the receipt of transfers, and thus do not want to
  setup preapprovals
* earning app rewards for all deposits and withdrawals

See the following sections for details on the work items it depends on.

* :ref:`Setup DevNet node and/or use LocalNet <test-node-setup>`
* :ref:`exchange-parties-setup`
* :ref:`one-step-deposit-workflow`
* :ref:`one-step-withdrawal-workflow`
* :ref:`Support restore from validator node backup <restore-from-validator-node-backup>`
* :ref:`Support hard synchronizer migration <hard-synchronizer-migration>`

**MVP for all CN Tokens**: this milestone allows you to support deposits and withdrawals of all CN tokens.
It comes with the limitation that application rewards are only earned on deposits of CC, but not on deposits of other CN tokens.
It depends on the MVP for CC and the following additional work items:

* :ref:`multi-step-deposit-workflow`
* :ref:`multi-step-withdrawal-workflow`, which resolves the limitation that users must setup a CC transfer preapproval to receive withdrawals.
* :ref:`token-onboarding`

**Earn app rewards for all CN tokens**: is a milestone that improves
the profitability of the integration by implementing  changes so
the exchange earns application rewards on both withdrawals and deposits of all CN tokens.
Sharing application rewards is an optional steps.

* :ref:`deposit-app-rewards`
* :ref:`withdrawal-app-rewards`
* :ref:`share-rewards-with-customers`
