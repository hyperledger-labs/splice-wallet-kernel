=======================================
Resilience and Disaster Recovery
=======================================

This guide outlines the recommended architecture for Canton Network wallet providers and exchanges to ensure business continuity. 
While these requirements are not a blocker for initial Canton Coin (CC) listing, they represent the target state for qualified 
custodians and institutional wallets post-MVP.

This guide explains approaches for Resilience and Disaster Recovery (DR).

----------------
Resilience Setup
----------------

Resilience refers to the ability to continue operations during minor failures, such as a single node outage.

Recommended Architecture
~~~~~~~~~~~~~~~~~~~~~~~~

* **Redundant Validators**: Run 2 validators behind a single gateway.
* **Confirming Rights**: Host parties on both validators with confirming rights.
* **Threshold Configuration**: Implement a confirming threshold of 1/2. This ensures that if one validator goes offline, the remaining node can still authorize transactions.

Adding Redundancy to an Existing Setup
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

If you are currently operating with a single validator node and wish to add a second node for Resilience, you must 
replicate your existing parties to the new infrastructure. This ensures both nodes have the necessary data and rights to manage your assets.

For technical instructions on moving or duplicating parties between nodes, refer to the documentation on 
`Party Replication <https://docs.digitalasset-staging.com/operate/3.3/howtos/operate/parties/party_replication.html>`_.

Potential Improvements for HA
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To further harden your HA setup, consider distributing your validator hosting across:

* **Availability Zones**: Different AZs within the same cloud region.
* **Cloud Regions**: Different cloud regions.
* **Multi-Cloud**: Different cloud providers to mitigate provider-wide outages.
* **Node Scaling**: Host more validators with a low confirming threshold.

----------------------
Disaster Recovery (DR)
----------------------

Disaster Recovery is the process of recovering from a scenario where a validator is lost completely and its immediate failovers are unavailable.

Backup Best Practices
~~~~~~~~~~~~~~~~~~~~~

* **Frequency**: Take backups at least weekly. High-volume institutional providers should consider increasing this frequency. The global synchronizer holds transaction data for 30 days so the remaining data can be re-hydrated from the global synchronizer for backups younger than 30 days.
* **Isolation**: Store backups in a suitably separate location to the validator nodes, such as a separate cloud or physical location.
* **Validation**: Regularly prove that you can restore from these backups to ensure the integrity of your recovery runbooks.

For documentation on how to take backups refer to the `Backups section here <https://docs.sync.global/validator_operator/validator_backups.html>`_.

------------------
Recovery Scenarios
------------------

Loss of a validator
~~~~~~~~~~~~~~~~~~~

All contract data on the lost validator can be recovered from backups. Refer to the 
`Restoring a validator from backups documentation <https://docs.sync.global/validator_operator/validator_disaster_recovery.html#restoring-a-validator-from-backups>`_.

Loss of a validator and data backups
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Canton Coin and CNS records can be recovered even in the event of total data loss. The 
`Recover from an identities backup documentation <https://docs.sync.global/validator_operator/validator_disaster_recovery.html#recovery-from-an-identities-backup-re-onboard-a-validator-and-recover-balances-of-all-users-it-hosts>`_
shows you how to re-onboard a validator and recover Canton Coin balances of all users it hosts.