.. _integration-extensions:

Integration Extensions
----------------------

Multi-Hosted Parties
~~~~~~~~~~~~~~~~~~~~

Sketch:

* allocate the ``treasuryParty`` from the start as a `decentralized party <https://docs.digitalasset.com/operate/3.4/howtos/operate/parties/decentralized_parties.html>`_ on multiple validator nodes

  * a common setup is to use two nodes with threshold two; thus both of them must confirm a tx for it to be committed

* upload all .dars for your onboarded tokens on all of these validators
* use any of the nodes hosting the party to read from as part of history ingestion and to prepare and execute transactions

  * switching between the nodes can be done. take care to re-synchronize the ingestion offset as described in :ref:`restore-from-validator-node-backup`


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
See this `Ledger API overview <https://docs.digitalasset.com/build/3.3/explanations/ledger-api.html>`_ for more information.
