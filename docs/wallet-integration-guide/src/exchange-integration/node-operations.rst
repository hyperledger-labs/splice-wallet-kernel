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

1. Use the validator operator party as your featured ``exchangeParty``.
   Follow :ref:`exchange-party-setup` to get it featured.
2. :ref:`treasury-party-setup` to create a ``treasuryParty`` with a transfer preapproval managed by your ``exchangeParty``.
3. Setup `automatic traffic purchases in the validator app <https://docs.dev.sync.global/validator_operator/validator_helm.html#configuring-automatic-traffic-purchases>`__.
4. Optional: setup `auto-sweep <https://docs.dev.sync.global/validator_operator/validator_helm.html#configuring-sweeps-and-auto-accepts-of-transfer-offers>`__
   from the ``exchangParty`` to your ``treasuryParty`` to limit the funds managed directly by the validator node.

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
as your featured ``exchangeParty``. This party is automatically created when you
`deploy your validator node <https://docs.dev.sync.global/validator_operator/validator_compose.html#deployment>`__.
Thus the only setup step is to get it featured by the SVs:

**On DevNet**, you can self-feature your validator operator party as follows:

1. `Log into the wallet UI for the validator user <https://docs.dev.sync.global/validator_operator/validator_helm.html#logging-into-the-wallet-ui>`__,
   which presents itself as in this screenshot:

   .. image:: images/wallet_ui.png

2. Tap 20 $ of CC to ensure that your validator operator party has enough funds to purchase traffic.
3. Click on the "Self-grant featured app rights" button.
4. The button is replaced with a star ⭐ icon once the ``FeaturedAppRight`` contract has been created for your validator operator party.
   This may take about 10 seconds.

That's all. Continue with :ref:`setting up your treasury party <treasury-party-setup>`.


**On MainNet**, apply for featured status for your validator operator party as follows:

1. `Log into the wallet UI for the validator user <https://docs.dev.sync.global/validator_operator/validator_helm.html#logging-into-the-wallet-ui>`__
   on your MainNet validator node.
2. Copy the party-id of your validator operator party using the copy button right of the abbreviated
   `"google-oaut.."` party name in the screenshot above.
3. Apply for featured application status using this link: https://sync.global/featured-app-request/

Wait until your application is approved.
The validator node will automatically pick up the featured status via the corresponding
``FeaturedAppRight`` contract issued by the DSO party for its validator operator party.

**On TestNet** there is currently no official process,
but you should be able to use the same procedure as the one for MainNet.


.. _treasury-party-setup:

Setup the treasury party
^^^^^^^^^^^^^^^^^^^^^^^^

Setup the ``treasuryParty`` as follows with a transfer preapproval managed by your ``exchangeParty``:

1. Create the ``treasuryParty`` using the wallet SDK to :ref:`create-an-external-party` with a key managed in a system of your choice
2. Copy the party id of your ``exchangeParty`` from the Splice Wallet UI as explained above,
   or retrieve it by calling ``/v0/validator-user`` on the `Validator API <https://github.com/hyperledger-labs/splice/blob/36ed55ea1fbb9b0030000bb0d0265ba811101df5/apps/validator/src/main/openapi/validator-internal.yaml#L14C3-L14C21>`__.
3. Call ``/v2/commands/submit-and-wait`` on the
   `Ledger API <https://github.com/digital-asset/canton/blob/eeb56bc5d9779a7f918893b7a6b15e0b312a044e/community/ledger/ledger-json-api/src/test/resources/json-api-docs/openapi.yaml#L6C3-L6C31>`__
   to create a ``#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal``
   (`code <https://github.com/hyperledger-labs/splice/blob/edb2257410dfc3660314765c40e59f41e2381150/daml/splice-wallet/daml/Splice/Wallet/TransferPreapproval.daml#L9>`__)
   directly with the ``provider`` set to your ``exchangeParty``.

   Note that setting up this transfer preapproval requires the ``exchangeParty`` to pay a small fee
   of about 0.25 $ worth of CC. The funds for this fee usually come from the validator liveness rewards that
   a validator node starts minting about 30 minutes after it is created. On DevNet or LocalNet,
   you don't have to wait that long: just "Tap" the required funds from the built-in faucet.

.. TODO: wrapper in wallet SDK


Testing the party setup
^^^^^^^^^^^^^^^^^^^^^^^

You can test the party setup on LocalNet or DevNet as follows:

1. Setup your ``exchangeParty`` and ``treasuryParty`` as explained above.
2. Setup an additional ``testParty`` representing a customer.
3. Transfer some CC from the ``testParty`` to the ``treasuryParty`` to simulate a deposit.
4. Observe the successful deposit by listing holdings of the ``treasuryParty``.
5. Observe about 30' later in the Splice Wallet UI of your validator operator user that the ``exchangeParty``
   minted app rewards for this deposit.
   It takes 30', as activity recording and rewards minting happen in different
   phases of a minting round.


.. _dar-file-management:

.dar File Management
--------------------

``.dar`` files define the Daml workflows used by the token admins for their tokens.
They must be uploaded to your Exchange Validator Node to be able to process
withdrawals and deposits for those tokens.

The ``.dar`` files for Canton Coin are managed by the Validator Node itself.
The ``.dar`` files for other tokens need to be uploaded by you
using the ``/v2/packages`` endpoint of the
`Ledger API <https://github.com/digital-asset/canton/blob/eeb56bc5d9779a7f918893b7a6b15e0b312a044e/community/ledger/ledger-json-api/src/test/resources/json-api-docs/openapi.yaml#L316>`__.
See this `how-to guide <https://docs.digitalasset.com/build/3.3/sdlc-howtos/applications/develop/manage-daml-packages.html>`__
for more information.

.. important::

   Only upload ``.dar`` files from token admins that you trust.
   The uploaded ``.dar`` files define the choices available on active contracts.
   Uploading a malicious ``.dar`` file could result in granting an attacker
   an unintended delegation on your contracts, which could lead to loss of funds.



.. _hard-synchronizer-migration:

Rolling out Major Splice Upgrades
---------------------------------


Sketch:

* See splice docs for context: https://docs.dev.sync.global/validator_operator/validator_major_upgrades.html
* like backup and restore above, but with a hard resynchronization to restart from offset ``0``
* determine the offset as of which the ACS export for the hard migration is taken, and ensure that
  your Tx Ingestion has ingested that before resynchronizing to the newly deployed validator node
