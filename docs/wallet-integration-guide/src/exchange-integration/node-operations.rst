Validator Node Operations
=========================

Reward Minting and Traffic Funding
----------------------------------

Party Setup
-----------

Setup up the featured exchange party
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. _setup-treasury-party:

Setup the treasury party
^^^^^^^^^^^^^^^^^^^^^^^^

Sketch:

* setup external party on validator node with key of your choice
* use Ledger API to create a ``#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal``
  directly with the ``provider`` set to your exchange party
   * TODO: wrapper in wallet SDK


.dar File Management
--------------------

Backup and Restore
------------------

* backup and restore of the Exchange Validator Node
* backup and restore of the Canton Integration DB

Rolling out Major Splice Upgrades
---------------------------------
