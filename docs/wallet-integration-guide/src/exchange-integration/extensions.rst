.. _integration-extensions:

Integration Extensions
----------------------

Multi-Hosted Parties
~~~~~~~~~~~~~~~~~~~~

As part of setting up the ``treasuryParty``, you need to sign the
``PartyToParticipant`` mapping which defines the set of confirming
nodes for that party as well as the confirmation threshold. The
confirming nodes for the party are essential to keep your party secure
and compromise of them could lead to loss of funds. Refer to the trust
model `trust model
<https://docs.digitalasset.com/overview/3.3/explanations/canton/external-party.html#party-trust-model>`_
for more details.

To guard against compromise, you can setup your party with multiple
confirming nodes and a threshold N > 1. As long as less than N nodes
are compromised, your party is still secured. Common setups are:

1. 2 confirming nodes with a threshold of 2. This provides security
   against a single node being compromised. Note that it does not
   provide availability in case of compromise though: If one node is
   compromised or down, transactions will be rejected as you will not
   be able to reach 2 valid confirmations. To be able to run
   transactions again you either need to bring both nodes back online
   or change the hosting nodes.
2. 3 confirming nodes with a threshold of 2. This extends the previous
   setup to also provide availability in case one of the nodes goes
   down or gets compromised as you can still reach 2 valid
   confirmations.

Party Setup
^^^^^^^^^^^

.. TODO:: https://github.com/hyperledger-labs/splice-wallet-kernel/issues/272 Update this when wallet SDK support is available

As part of the :ref:`initial party setup <create-an-external-party>`_,
you can specify multiple multiple confirming participants and a
threshold as needed. Note that at this point, the wallet SDK library
does not yet support this so you must go directly through the Canton
APIs. This is expected to change soon. Until then, the easiest way to do so at the moment is through the Canton
console. You can find a full reference for all required steps in the
`integration test
<https://github.com/digital-asset/canton/blob/3c9ac9891c03cb06303736d7224bcc01dbd50084/community/app/src/test/scala/com/digitalasset/canton/integration/tests/jsonapi/ExternalPartyLedgerApiOnboardingTest.scala#L183>`_. Note
in particular that you must sign the ``PartyToParticipant`` mapping
not just by your party's key but also by all confirming
participants. This is accomplished through the
``participant2.topology.transactions.authorize`` step in the test.

DAR Management
^^^^^^^^^^^^^^

Any DAR that you upload, both as part of the initial setup but also
whenever you upload newer versions to upgrade an existing package,
must be uploaded to all confirming nodes of the party.

Reading Data and Submitting Transactions
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

You can use any of the confirming nodes for reading data of a party
hosted on them. However, offsets are not comparable across nodes so it
is recommended that to run Tx History Ingestion against the same node
under normal operations. If you do need to switch nodes, you can do so
following the same procedure used for `restoring a validator from a
backup <validator_backup_restore>`_ to resynchronize Tx History
Ingestion against the offsets of the new node.

Preparation and execution of transactions can also be done against any
of the confirming nodes of the party. However, `Command Deduplication
<https://docs.digitalasset.com/build/3.3/sdlc-howtos/applications/develop/command-deduplication.html>`_
is only performed by the executing node so if you submit across nodes you cannot rely on it.

.. TODO:: Link to recommended deduplication strategy https://github.com/hyperledger-labs/splice-wallet-kernel/issues/423

Changing the set of Confirming Nodes
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

It is highly recommended to setup your desired set of confirming nodes
when initially setting up the party as changes to the set of
confirming nodes are tricky. Adding and removing nodes is possible but
it is a fragile procedure that is not recommended in production at
this point. This will be improved in future releases.

If you do find yourself in a situation where you don't have any other
option than changing the set of confirming nodes, refer to the `Canton documentation <https://docs.digitalasset.com/operate/3.3/howtos/operate/parties/party_replication.html#offline-party-replication>`_ for detailed information on the limitations. At a high level, the limitations are as follows:

Removing nodes is possible by submitting a new ``PartyToParticipant`` mapping but can leave
the nodes hosting the party in a broken state so make sure that those
nodes were not used for other purposes.

Adding new nodes does not just require changing the
``PartyToParticipant`` mapping but it also requires a manual state
transfer of all active contracts to new confirming nodes. This is an
involved procedure with high potential for issues.


App Reward Optimization
~~~~~~~~~~~~~~~~~~~~~~~

Sketch:

* use Daml model to create featured app reward markers in the same tx that acts on a transfer: https://github.com/hyperledger-labs/splice/pull/1729/files#diff-f9e3d1de2443dd22c3999d1018d1c3ef2031c76626f97c8b951ab7f351e17999
* likely this Daml model will come as part the wallet SDK or be part of Splice
* sketch of the model referenced from here: https://github.com/hyperledger-labs/splice/issues/1901#issuecomment-3183999764
* upload the corresponding .dar to your validator node; note that only your node needs it. Customers won't see it.

.. _deposit-app-rewards:

Earn App Rewards for Deposits
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Sketch:

* change call to ``TransferInstruction_Accept`` to use the wrapped version, like the one here https://github.com/hyperledger-labs/splice/pull/1907/files#diff-4cbc6e851f73f40db384d63aa97dbf4ffb93c505b0ed0c3c360e7914f94f6201R64-R73
* note history tx parser should deal with this properly and just ignore the extra wrapper. So no further change required

.. _withdrawal-app-rewards:

Earn App Rewards for Withdrawals
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Sketch:

* change call to ``TransferFactory_Transfer`` to use the wrapped version, like the one here https://github.com/hyperledger-labs/splice/pull/1907/files#diff-4cbc6e851f73f40db384d63aa97dbf4ffb93c505b0ed0c3c360e7914f94f6201R54-R62
* note history tx parser should deal with this properly and just ignore the extra wrapper. So no further change required


.. _share-rewards-with-customers:

Sharing App Rewards with your Customers
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Sketch:

* use the benefeciary feature of app rewards to share some of the rewards with your customers

  * see https://hyperledger-labs.github.io/splice/background/tokenomics/feat_app_act_marker_tokenomics.html#creating-a-featured-application-activity-marker


Sharding the Treasury
~~~~~~~~~~~~~~~~~~~~~

Sketch: the :ref:`integration-architecture` is already built to support multiple treasury parties

* allocate multiple treasury parties in :ref:`exchange-parties-setup`; they can even be one separate nodes
* run Tx History Ingestion, Withdrawal Automation, Multi-Step Deposit Automation once for each ``treasuryParty``
* have your Exchange Internal Systems pick the ``treasuryParty`` that should execute the withdrawal

  * you might have to split large withdrawals over multiple parties in case none of them have large enough balances on their own



Using the gRPC Ledger API
~~~~~~~~~~~~~~~~~~~~~~~~~

Feel free to do so if you prefer using gRPC.
It is functionally equivalent to the JSON Ledger API.
See this `Ledger API overview <https://docs.digitalasset.com/build/3.3/explanations/ledger-api.html>`__ for more information.
