Backup and Restore
==================

Recall that the :ref:`integration-architecture`, shown in the diagram below, relies on two stateful components:
the Exchange Validator Node and the Canton Integration DB.
We recommend backing them up regularly, so that you can restore them in case of a disaster.

Restoring these components from a backup can lead to data loss,
which needs to be handled carefully in the integration components you are building.
See the sections below for guidance on how to do so.

.. image:: images/component_diagram.png
  :alt: Integration architecture component overview


.. _restore-from-validator-node-backup:

Backing up the Exchange Validator Node
---------------------------------------

Follow the `Splice documentation on how to backup a validator node
<https://docs.dev.sync.global/validator_operator/validator_backups.html>`__.


.. TODO: add recommendation to splice docs to take a backup after key rotations, user allocation,
   .dar upload


Backing up the Canton Integration DB
-------------------------------------

As explained in the :ref:`canton-integration-components` section of the :ref:`integration-architecture`,
the Canton Integration DB is more of a logical component.
Whether you implement it as a separate DB or as part of the DBs backing your Exchange Internal Systems
is up to you.

Follow your internal guidance and best practices on what DB system to use and how to back it up.

.. _validator_backup_restore:

Restoring the Exchange Validator Node from a Backup
---------------------------------------------------

Follow the `Splice documentation on how to restore a validator node from a backup
<https://docs.dev.sync.global/validator_operator/validator_disaster_recovery.html#restoring-a-validator-from-backups>`__
to restore the Exchange Validator Node from a backup that is less than 30 days old.

The node will resubscribe to transaction data from the synchronizer and recover
all committed transactions and the corresponding changes to the set of active
contracts (i.e. UTXOs).
However validator-node local data written after the backup will be lost,
as described on the `Canton documentation page <https://docs.digitalasset.com/operate/3.3/howtos/recover/backup-restore.html#restore-caveats>`__.

In the context of the recommended :ref:`integration-workflows`, this data loss
affects:

* **.dar file uploads**: handle this by repeating the upload of all ``.dar`` files that were uploaded after the backup.
  This should be a rare event, as :ref:`token onboarding <token-onboarding>` is infrequent.

* **Ledger API offsets**: offsets assigned to transactions received from the Ledger API may
  change. This only affects the Tx History Ingestion component of the integration.

  We recommend to handle this by implementing the Tx History Ingestion component such that
  it skips reingesting transactions that it has already ingested before the backup.
  It can do so by skipping ingesting transactions with a record time less than
  or equal to the record time of the last ingested transaction.
  Make sure that it still updates the last ingested offset
  even when skipping reingestion of such transactions.

  With that change you can handle restoring from a backup as follows:

    1. Stop Tx History Ingestion before restoring the Exchange Validator Node from a backup.
    2. Retrieve the record time ``tRecovery`` and ``synchronizerId`` of the last ingested transaction from the Canton Integration DB.
    3. Restore the Exchange Validator Node from the backup.
    4. Reupload all ``.dar`` files that were uploaded after the backup.
    5. Log into the `Canton Console of your validator node <https://docs.dev.sync.global/deployment/console_access.html>`__
       and query the offset ``offRecovery`` assigned to ``tRecovery`` using

       .. code-block:: bash

          $ participantX.parties.find_highest_offset_by_timestamp(synchronizerId, tRecovery)

    6. Configure the Tx History Ingestion component to start ingesting from offset ``offRecovery``.
    7. Restart the Tx History Ingestion component.

  Once Tx History Ingestion has caught up, the integration workflows will continue
  as before the disaster.



Backup and Restore of the Canton Integration DB
--------------------------------------------------

Sketch:

* the loss of data affects only the data written by the exchange internal systems; i.e., the data
  written in Step 2 of the :ref:`one-step-withdrawal-workflow`. Looking at that data we observe:

  * withdrawal requests might be in-flight on Canton for which there is no entry in the integration DB
  * ``Holding`` UTXOs might be marked as non-reserved, but they are actually spent by in-flight withdrawal transfers

* ensure that history ingestion of ``TransferInstruction`` UTXOs for outgoing transfers also succeeds if the withdrawal id cannot be resolved; e.g. by creating a record
  for them. Consider storing extra metadata in the ``Transfer`` record to be able to do so from the on-chain data only.
* wait with reserving UTXOs until the Canton Integration DB has resynchronized with all in-flight
  withdrawals; e.g., by waiting until you observe a record time larger than the largest target record time of in-flight withdrawals
  (you should be able to estimate that using ``now + yourDefaultInFlightTimeout``).
