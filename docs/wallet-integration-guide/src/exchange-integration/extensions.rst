.. _integration-extensions:

Integration Extensions
----------------------

This page describes the following additional features that you can consider adding to your integration,
beyond the MVP described in the :ref:`exchange-integration-overview` section:

.. contents::
   :local:
   :depth: 2
   :backlinks: none


Optimizing App Rewards
~~~~~~~~~~~~~~~~~~~~~~

Sketch:

* use Daml model to create featured app reward markers in the same tx that acts on a transfer: https://github.com/hyperledger-labs/splice/pull/1729/files#diff-f9e3d1de2443dd22c3999d1018d1c3ef2031c76626f97c8b951ab7f351e17999
* likely this Daml model will come as part the wallet SDK or be part of Splice
* sketch of the model referenced from here: https://github.com/hyperledger-labs/splice/issues/1901#issuecomment-3183999764
* upload the corresponding .dar to your validator node; note that only your node needs it. Customers won't see it.

.. _deposit-app-rewards:

Earning App Rewards for Deposits
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Sketch:

* change call to ``TransferInstruction_Accept`` to use the wrapped version, like the one here https://github.com/hyperledger-labs/splice/pull/1907/files#diff-4cbc6e851f73f40db384d63aa97dbf4ffb93c505b0ed0c3c360e7914f94f6201R64-R73
* note history tx parser should deal with this properly and just ignore the extra wrapper. So no further change required

.. _withdrawal-app-rewards:

Earning App Rewards for Withdrawals
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Sketch:

* change call to ``TransferFactory_Transfer`` to use the wrapped version, like the one here https://github.com/hyperledger-labs/splice/pull/1907/files#diff-4cbc6e851f73f40db384d63aa97dbf4ffb93c505b0ed0c3c360e7914f94f6201R54-R62
* note history tx parser should deal with this properly and just ignore the extra wrapper. So no further change required


.. _share-rewards-with-customers:

Sharing App Rewards with your Customers
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Sketch:

* use the benefeciary feature of app rewards to share some of the rewards with your customers

  * see https://hyperledger-labs.github.io/splice/background/tokenomics/feat_app_act_marker_tokenomics.html#creating-a-featured-application-activity-marker


.. _treasury-sharding:

Sharding the Treasury
~~~~~~~~~~~~~~~~~~~~~

Sketch: the :ref:`integration-architecture` is already built to support multiple treasury parties

* allocate multiple treasury parties in :ref:`exchange-parties-setup`; they can even be one separate nodes
* run Tx History Ingestion, Withdrawal Automation, Multi-Step Deposit Automation once for each ``treasuryParty``
* have your Exchange Internal Systems pick the ``treasuryParty`` that should execute the withdrawal

  * you might have to split large withdrawals over multiple parties in case none of them have large enough balances on their own

Multi-Hosting the Treasury Party
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The :ref:`documentation on setting up the exchange party <treasury-party-setup>` describes how to setup a party with a single
confirming node. This can be sufficient but the confirming nodes for
the party are essential to keep your party secure and compromise of
them could lead to loss of funds. Refer to the trust model `trust
model
<https://docs.digitalasset.com/overview/3.3/explanations/canton/external-party.html#party-trust-model>`_
for more details.

To guard against compromise of the confirming nodes, you can setup your ``treasuryParty`` with multiple
confirming nodes and a threshold N > 1. As long as less than N nodes
are compromised, your party is still secured. Common setups are:

1. Two confirming nodes with a threshold of 2. This provides security
   against a single node being compromised. However, if one of the two nodes is down,
   transactions for the party will fail.
2. 3 confirming nodes with a threshold of 2. This extends the previous
   setup to also provide availability in case one of the nodes goes
   down or gets compromised as the other two nodes are still functional.

Party Setup
^^^^^^^^^^^

.. TODO:: https://github.com/hyperledger-labs/splice-wallet-kernel/issues/272 Update this when wallet SDK support is available

As part of the :ref:`initial treasury party setup
<create-an-external-party>`, you generate the ``PartyToParticipant``
topology transaction which lists both the confirming nodes and the
confirmation threshold.  To host a party on multiple nodes, you need
to include all confirming nodes in the ``PartyToParticipant`` mapping
when you setup the party initially. Note that at this point, the
wallet SDK library does not yet support this so you must go directly
through the Canton APIs. This is expected to change soon.

Until then, the easiest way to do so at the moment is through the Canton
console. You can find a full reference for all required steps in the
`integration test <https://github.com/digital-asset/canton/blob/3c9ac9891c03cb06303736d7224bcc01dbd50084/community/app/src/test/scala/com/digitalasset/canton/integration/tests/jsonapi/ExternalPartyLedgerApiOnboardingTest.scala#L183>`_.
Note in particular that you must sign the ``PartyToParticipant`` mapping
not just by your party's key but also by all confirming
participants. This is accomplished through the
``participant2.topology.transactions.authorize`` step in the test.

.dar File Management
^^^^^^^^^^^^^^^^^^^^

Any .dar file that you upload, both as part of the initial setup but also
whenever you upload newer versions to upgrade an existing package,
must be uploaded to all validator nodes hosting your party.

Reading Data and Submitting Transactions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Both nodes serve all transactions for the ``treasuryParty`` and can
thus be used in principle to read them.
However, offsets are not comparable across nodes so it
is recommended that to run Tx History Ingestion against the same node
under normal operations. If you do need to switch nodes, you can do so
following the same procedure used for `restoring a validator from a
backup <validator_backup_restore>`_ to resynchronize Tx History
Ingestion against the offsets of the new node.

Preparation and execution of transactions can also be done against any
of the confirming nodes of the party. However, `Command Deduplication
<https://docs.digitalasset.com/build/3.3/sdlc-howtos/applications/develop/command-deduplication.html>`_
is only performed by the executing node so if you submit across nodes
you cannot rely on it. It is therefore recommend _not_ to rely on
command deduplication at all in favor of :ref:`UTXO and max record time based deuplication <withdrawal-automation>`.

.. TODO:: Link to recommended deduplication strategy https://github.com/hyperledger-labs/splice-wallet-kernel/issues/423

Changing the set of Confirming Nodes
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

There are some limitations on changing the set of confirming nodes:

Removing confirming nodes is possible by submitting a new
``PartyToParticipant`` topology transaction. However, this can leave the nodes that
you remove in a broken state so this should be limited to cases where
that node got compromised or is no longer needed for other purposes.

Adding new confirming nodes is not currently possible. If this is required, you need to instead:

1. Setup a new treasury party with the desired set of confirming nodes.
2. Either transfer all funds from the existing treasury party to the
   new one and switch only to the new treasury party or rely on
   :ref:`treasury-sharding` to use both treasury parties until you are
   ready to phase out the old party.

Changing the confirmation threshold is possible at any point by
submitting a new ``PartyToParticipant`` topology transaction with the
updated threshold.

Future versions of Canton will allow changing the confirming nodes without the need for setting up a new party.



Using the gRPC Ledger API
~~~~~~~~~~~~~~~~~~~~~~~~~

Feel free to do so if you prefer using gRPC.
It is functionally equivalent to the JSON Ledger API.
See this `Ledger API overview <https://docs.digitalasset.com/build/3.3/explanations/ledger-api.html>`__ for more information.
