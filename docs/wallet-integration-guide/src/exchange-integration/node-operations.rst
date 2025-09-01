Validator Node Operations
=========================


Reward Minting and Traffic Funding
----------------------------------

Sketch:

* make your validator node party the featured ``exchangeParty``
* the validator app will automatically mint the validator and app rewards for that party
* setup `automatic traffic purchases in the validator app <https://docs.dev.sync.global/validator_operator/validator_helm.html#configuring-automatic-traffic-purchases>`__
* optional: setup `auto-sweep <https://docs.dev.sync.global/validator_operator/validator_helm.html#configuring-sweeps-and-auto-accepts-of-transfer-offers>`__ to your ``treasuryParty`` to limit the funds managed by the validator party for that party


.. _exchange-parties-setup:

Setup Exchange Parties
----------------------

Setup up the featured exchange party
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Sketch:

* this is automatically setup as part of setting up your node
* you can retrieve validator party from `/v0/validator-user` from the
  `Validator API <https://github.com/hyperledger-labs/splice/blob/edb2257410dfc3660314765c40e59f41e2381150/apps/validator/src/main/openapi/validator-internal.yaml#L14C2-L14C21>`__

  * TODO: package this up into the wallet SDK


.. _setup-treasury-party:

Setup the treasury party
^^^^^^^^^^^^^^^^^^^^^^^^

Sketch:

* Use the wallet SDK to :ref:`create-an-external-party` with a key managed in a system of your choice
* use the Ledger API to create a ``#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal``
  (`code <https://github.com/hyperledger-labs/splice/blob/edb2257410dfc3660314765c40e59f41e2381150/daml/splice-wallet/daml/Splice/Wallet/TransferPreapproval.daml#L9>`__)
  directly with the ``provider`` set to your exchange party

 * TODO: wrapper in wallet SDK



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
