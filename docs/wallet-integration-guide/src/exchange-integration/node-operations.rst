Validator Node Operations
=========================


.. _reward-minting-and-traffic-funding:

Reward Minting and Traffic Funding
----------------------------------

As explained in :ref:`tokenomics-fees-and-rewards`,
your validator node will need traffic to submit the transactions to execute withdrawals
or accept multi-step deposits. As also explained in that section,
the network provides rewards that can be used to fund traffic.

Note also that every validator node has an associated **validator operator party** that
represents that validator node's administrator
(`docs <https://docs.dev.sync.global/validator_operator/validator_compose.html#deployment>`__).
The validator node automatically mints rewards for that party.
It can further be configured to
`automatically purchase traffic <https://docs.dev.sync.global/validator_operator/validator_helm.html#configuring-automatic-traffic-purchases>`__ using
that party's CC balance, which includes the minted rewards.

We thus recommend the following setup as a starting point to mint
rewards and automatically fund traffic:

* Use the validator operator party as your featured ``exchangeParty``. See :ref:`exchange-party-setup` for how to get it featured.
* Setup `automatic traffic purchases in the validator app <https://docs.dev.sync.global/validator_operator/validator_helm.html#configuring-automatic-traffic-purchases>`__.
* Optional: setup `auto-sweep <https://docs.dev.sync.global/validator_operator/validator_helm.html#configuring-sweeps-and-auto-accepts-of-transfer-offers>`__ to your ``treasuryParty`` to limit the funds managed by the validator party for that party

As a starting point for the automatic traffic purchase configuration, set
``targetThroughput`` to 2kB/s and ``minTopupInterval`` to 1 minute, which should be sufficient to execute about one
withdrawal or deposit acceptance every 10 seconds.
Please test this with your expected traffic pattern and adjust as needed.
See this `FAQ to measure the traffic spent on an individual transaction <https://docs.dev.sync.global/faq.html#term-How-do-I-determine-the-traffic-used-for-a-specific-transaction>`__.

.. _exchange-parties-setup:

Setup Exchange Parties
----------------------


.. _exchange-party-setup:

Setup up the featured exchange party
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

As explained above in :ref:`reward-minting-and-traffic-funding`, we recommend to use the validator operator party
your featured ``exchangeParty``. This party is automatically created when you
`deploy your validator node <https://docs.dev.sync.global/validator_operator/validator_compose.html#deployment>`__.
Thus the only additional step is to get it featured by the SVs:

**On DevNet**, you can self-feature your validator operator party as follows:

1. `Log into the wallet UI for the validator user <https://docs.dev.sync.global/validator_operator/validator_helm.html#logging-into-the-wallet-ui>`__,
   which presents itself as in this screenshot:

   .. image:: images/wallet_ui.png

2. Click on the "Self-grant featured app rights" button.
3. The button is replaced with a star ⭐ icon once the ``FeaturedAppRight`` contract has been created for your validator operator party.
   This may take about 10 seconds.

That's all. Continue with :ref:`setting up your treasury party <treasury-party-setup>`.


**On MainNet**, you need to apply for featured status for your validator operator party as follows:

1. `Log into the wallet UI for the validator user <https://docs.dev.sync.global/validator_operator/validator_helm.html#logging-into-the-wallet-ui>`__
   on your MainNet validator node.
2. Copy the party-id of your validator operator party using the copy button right of the abbreviated
   `"google-oaut.."`` party name in the screenshot above.
3. Apply for featured application status using this link: https://sync.global/featured-app-request/

Wait until your application is approved.
The validator node will automatically pick up the featured status via the corresponding
``FeaturedAppRight`` contract issued by the DSO party for its validator operator party.

**On TestNet** you can use the same procedure as the one for MainNet.


.. _treasury-party-setup:

Setup the treasury party
^^^^^^^^^^^^^^^^^^^^^^^^

Sketch:

* Use the wallet SDK to :ref:`create-an-external-party` with a key managed in a system of your choice
* use the Ledger API to create a ``#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal``
  (`code <https://github.com/hyperledger-labs/splice/blob/edb2257410dfc3660314765c40e59f41e2381150/daml/splice-wallet/daml/Splice/Wallet/TransferPreapproval.daml#L9>`__)
  directly with the ``provider`` set to your exchange party

 * TODO: wrapper in wallet SDK


Testing the party setup
^^^^^^^^^^^^^^^^^^^^^^^




.dar File Management
--------------------

Sketch:

* upload using the Ledger API: https://docs.digitalasset.com/build/3.3/sdlc-howtos/applications/develop/manage-daml-packages.html


.. _restore-from-validator-node-backup:

Backup and Restore
------------------


Sketch: considerations when restoring from a validator node backup

* offsets change ==> put tx history ingestion into recovery mode and use the last ingested update-id to re-synchronize



.. _hard-synchronizer-migration:

Rolling out Major Splice Upgrades
---------------------------------


Sketch:

* See splice docs for context: https://docs.dev.sync.global/validator_operator/validator_major_upgrades.html
* like backup and restore above, but with a hard resynchronization to restart from offset ``0``
* determine the offset as of which the ACS export for the hard migration is taken, and ensure that
  your Tx Ingestion has ingested that before resynchronizing to the newly deployed validator node
