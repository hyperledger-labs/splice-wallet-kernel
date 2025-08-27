.. _integration-workflows:

Integration Workflows
=====================

Overview
--------

The workflows below are grouped into two integration stages.

* :ref:`mvp-for-cc` contains the minimum viable product (MVP) workflows for integrating Canton Coin (CC) into the exchange.
  It comes with the limitation that both the exchange and the customers need to set up a ``TransferPreapproval`` to
  enable 1-step transfers of CC.
* :ref:`mvp-for-cn-tokens` contains the additional workflows required to support
  all CN tokens. They are the workflows to onboard a new token and
  the workflows to support multi-step transfers for both deposits and withdrawals.
  Multi-step transfers are a part of the Canton Network Token Standard to support
  tokens where the receiver is given a choice to reject an incoming transfer as well as
  to support additional asynchronous checks on transfers by the token admin (e.g. KYC/AML checks).

Further extensions of these two MVPs to address Day-2 requirements are discussed in :ref:`integration-extensions`.

.. important::

  The current descriptions of the workflows do not yet call out the wallet SDK
  functions implementing their individual steps; and may thus appear overly detailed and complex.
  They are meant to give a first overview until the references to the specific SDK functions have been added.

  .. todo:: add these functions. potentially using sphinx-tabs to allow switching between SDK function view and higher-level description


.. _mvp-for-cc:

MVP for Canton Coin
-------------------


1-Step Deposit Workflow
^^^^^^^^^^^^^^^^^^^^^^^

.. image:: images/1-step_deposit.png
  :alt: 1-Step Deposit Workflow Diagram

Assumptions:

-  Exchange set up a CC ``TransferPreapproval`` for their
   ``treasuryParty`` as explained in :ref:`setup-treasury-party`.
-  Exchange associated deposit account “abc123” with Customer in
   the Canton Integration DB.

Example Flow:

1. Customer uses Exchange UI to retrieve ``treasuryParty`` and deposit
   account-id “abc123” to use for the deposit
2. Customer uses Customer Wallet to initiate a token standard transfer of
   100 CC to ``treasuryParty`` with metadata key
   ``splice.lfdecentralizedtrust.org/reason`` set to “abc123”.

   a. Customer Wallet selects CC ``Holding`` UTXOs to fund the transfer
      and queries Canton Coin Scan to retrieve registry-specific
      ``TransferFactory`` and extra transfer context. The returned data
      includes the ``TransferPreapproval`` for the ``treasuryParty``.
   b. Customer wallet submits the command to exercise
      ``TransferFactory_Transfer`` choice together with the extra
      transfer context. The resulting transaction archives the funding
      CC ``Holding`` UTXOs and creates a CC ``Holding`` UTXO with
      contract-id ``coid234`` owned by the ``treasuryParty`` and
      another CC ``Holding`` UTXO for the change owned by the Customer.
   c. The resulting transaction gets committed across the Customer,
      Exchange, and Admin validator nodes. It is assigned an
      update-id ``upd567`` and a record time ``t1`` by the Global
      Synchronizer. It is assigned offset ``off1`` by the Exchange
      Validator Node.

3. Tx History Ingestion observes ``upd567`` at ``t1`` with offset
   ``off1`` and updates the Canton Integration DB as follows.

   a. Tx History Ingestion parses ``upd567`` using the token standard tx
      history parser from the Wallet SDK to determine:

      * The deposit amount of 100 CC.
      * The deposit account “abc123” from the
        ``splice.lfdecentralizedtrust.org/reason`` metadata value.
      * The new ``Holding`` UTXO ``coid234`` owned by the
        ``treasuryPary``

   b. Tx History ingestion writes the following in a single, atomic
      transaction to the Canton Integration DB

      * The latest ingested update-id ``upd567`` its record time ``t1``
        and offset ``off1``.
      * The new CC ``Holding`` UTXO ``coid234`` for the 100 CC that was
        received.
      * The credit of 100 CC on the Customer’s account at the exchange.

4. Customer observes the successful deposit in their Exchange UI,
   whose data is retrieved from the Canton Integration DB via the Exchange Internal Systems.


1-Step Withdrawal Workflow
^^^^^^^^^^^^^^^^^^^^^^^^^^

.. image:: images/1-step_withdrawal.png
  :alt: 1-Step Withdrawal Workflow Diagram

Assumptions:

1. Customer set up a CC ``TransferPreapproval`` for their
   ``customerParty``.

Example Flow:

1. Customer requests withdrawal of 100 CC to ``customerParty`` using
   the Exchange UI.
2. Exchange Internal Systems process that request and update the
   Canton Integration DB to store:

   * The deduction of 100 CC from the Customer's trading account.
   * The pending withdrawal with id ``wid123`` of 100 CC to
     ``customerParty``.
   * The CC ``Holding`` UTXOs ``ccids`` to use to fund the transfer to
     ``customerParty`` for ``wid123``. See :ref:`utxo-management` for more information.
   * The target record time ``trecTgt`` on the Global Synchronizer
     until which the transaction for the CC transfer must be committed
     using the ``ccids`` UTXOs for funding ``wid123``. The ``ccids``
     are considered to be reserved to funding this transfer until
     ``trecTgt`` has passed.

3. Withdrawal Automation observes the pending withdrawal ``wid123`` and
   commits the corresponding CC transfer as follows.

   a. Withdrawal Automation queries Canton Coin Scan to retrieve the
      ``TransferFactory`` for CC and extra transfer context.
   b. Withdrawal automation checks that transfer is indeed a 1-step
      transfer by checking that ``transfer_kind == "direct"`` in the response from
      Canton Coin Scan. If that is not the case, then it marks the withdrawal
      as failed in the Canton Integration DB and stops processing.
   c. Withdrawal Automation prepares, signs, and submits the command to
      returned data includes the ``TransferPreapproval`` for the
      ``customerParty`` if it exists. Withdrawal Automation verifies this
      exercise the ``TransferFactory_Transfer`` choice with the
      exclusive upper-bound for the record time of the commit set to
      ``trecTgt``. It also sets the value for key
      ``splice.lfdecentralizedtrust.org/reason`` in the ``Transfer`` metadata to ``wid123``.
   d. The resulting transaction archives the CC ``Holding`` UTXOs
      ``ccids`` used to fund the transfer and creates one CC ``Holding``
      UTXO with contract-id ``coid345`` owned by the ``customerParty``
      and another one with contract-id ``coid789`` owned by
      ``treasuryParty`` representing the change returned to the
      Exchange. The resulting transaction gets committed across the
      Customer, Exchange, and Admin validator nodes. It is assigned
      an update-id ``upd567`` and a record time ``t1`` < ``trecTgt`` by
      the Global Synchronizer. It is assigned ``off1`` by the Exchange
      Validator Node. It is assigned ``off2`` by the Customer Validator
      Node.

4. Tx History Ingestion observes ``upd567`` at ``t1`` with offset
   ``off1`` and updates the Canton Integration DB as follows.

   a. Tx History Ingestion parses ``upd567`` using the token standard tx
      history parser from the Wallet SDK to determine:

      * The withdrawal-id ``wid123`` from the
        ``splice.lfdecentralizedtrust.org/reason`` metadata value.
      * The new ``Holding`` UTXO ``coid789`` owned by the
        ``treasuryParty``

   b. Tx History ingestion writes the following in a single, atomic
      transaction to the Canton Integration DB

      * The latest ingested update-id ``upd567``, its record time
        ``t1`` and offset ``off1``.
      * The successful completion of withdrawal ``wid123`` by the
        transaction with update-id ``upd567`` at record time ``t1``.
      * The archival of the CC ``Holding`` UTXOs ``ccids``.
      * The new CC ``Holding`` UTXO ``coid789`` for the change returned
        after funding the CC transfer.

5. Customer Wallet observes ``upd567`` at ``t1`` with offset ``off2`` on
   the Customer Validator Node, parses it using the token standard tx
   history parser and updates its UI as follows:

   * Its tx history shows the receipt of 100 CC from ``exchangeParty``
     with “Reason” ``wid123`` that was committed as update ``upd567``
     at ``t1``.
   * Its holding listing shows the new CC ``Holding`` with contract id
     ``coid345``.

6. Customer observes the completion of the withdrawal at ``t1`` in the
   Exchange UI and the receipt of the expected funds in their Customer Wallet.


.. _utxo-management:

UTXO Selection and Management
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

TODO: write this

Handling Failures and Crashes
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Sketch for crashes and restarts:

* Tx History Ingestion restarts and continues from the last ingested offset.
  If none is set, then that means it never ingested any transaction.
  It starts from the beginning of the transaction history, which is always as offset ``0``.
* withdrawal automation is stateless, so just restarts

Sketch for retries:

* Tx History Ingestion retries a bounded number of times on failures from reading from the
  Ledger API and crashes if that number is exceeded.
* Withdrawal Automation retries a bounded number of times on failures.
  A withdrawal is considered definitely failed once its target record time ``trecTgt`` is below
  the last ingested record time.

   * Note: Canton participant nodes regularly (every 30' by default) requesting time-proofs from the sequencer
     to ensure that they observe time progressing even if there's no activity.
     They expose this information to Ledger API clients
     via ``OffsetCheckpoints`` (`docs <https://docs.digitalasset-staging.com/build/3.3/reference/lapi-proto-docs.html#com-daml-ledger-api-v2-offsetcheckpoint>`_).




.. _mvp-for-cn-tokens:

MVP for all Canton Network Tokens
---------------------------------


Multi-Step Deposit Flow
^^^^^^^^^^^^^^^^^^^^^^^

TODO: add diagram, and flow description


Multi-Step Withdrawal Flow
^^^^^^^^^^^^^^^^^^^^^^^^^^

TODO: add diagram, polish write-up


Canton Network Token Onboarding
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
