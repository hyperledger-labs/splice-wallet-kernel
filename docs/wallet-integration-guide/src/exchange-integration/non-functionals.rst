Fault Tolerance
===============



Handling Crashes
^^^^^^^^^^^^^^^^

Sketch for crashes and restarts:

* Tx History Ingestion restarts and continues from the last ingested offset.
  If none is set, then that means it never ingested any transaction.
  It starts from the beginning of the transaction history, which is always as offset ``0``.
* withdrawal automation is stateless, so just restarts


Handling RPC Errors
^^^^^^^^^^^^^^^^^^^

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


.. _reading-from-canton-coin-scan:

Reading from Canton Coin Scan
-----------------------------

.. TODO: expand


Sketch wrt reading from Canton Coin Scan: choose one of

  * read from validator proxy or
  * choose a random canton coin scan instance on every retry
  * read from multiple canton coin scan instances in parallel and compare their responses (this is what validator proxy does for you)

Note: the same approach should be used for other decentralized tokens.
