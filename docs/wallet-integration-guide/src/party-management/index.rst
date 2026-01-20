.. _create-an-external-party:

Create an External Party (Wallet)
=================================

Overview
--------

Parties represent acting entities in the network and all transaction happens between one or more parties.
To understand more about parties see the :ref:`Parties <parties>` in the Overview.

A detailed tutorial of the steps below can be seen in the External Signing Tutorial `here <https://docs.digitalasset.com/build/3.3/tutorials/app-dev/external_signing_onboarding.html>`_ using python example scripts.

*This document focuses on the steps required to create an external party using the Wallet SDK.*

How do I quickly allocate a party?
-----------------------------------
Using the wallet SDK you can quickly allocate a party using the following code snippet:

.. tabs::

    .. tab:: Comprehensive using Splice LocalNet

        .. literalinclude:: ../../examples/scripts/02-auth-localnet.ts
            :language: typescript
            :dedent:

    .. tab:: Quick using Splice LocalNet

        .. literalinclude:: ../../examples/snippets/allocate-party.ts
            :language: typescript
            :dedent:

    .. tab:: Comprehensive using OAuth

        .. literalinclude:: ../../examples/scripts/01-auth.ts
            :language: typescript
            :dedent:


Create a key pair
-----------------
The process for creating a key using standard encryption practices is similar that in other blockchains. The full details of supported cryptographic algorithms can be found `Here <https://docs.daml.com/canton/usermanual/security.html#common-node-keys>`__.
By default an **Ed25519** encryption is used. There exists many libraries that can be used to generate such a key pair, you can do it simply with the WalletSDK using:

.. literalinclude:: ../../examples/snippets/create-key-pair.ts
   :language: typescript
   :dedent:

Generating Keys from a Mnemonic Phrase (BIP-0039)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

The Canton Network supports the generation of cryptographic keys using a mnemonic code or mnemonic sentence, 
following the `BIP-0039 standard <https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki>`_. 

Using a mnemonic phrase allows for deterministic key generation, which simplifies the backup and recovery process. 
Instead of managing individual private key files, you can recreate your keys across different environments using a 
human-readable sequence of words.

A typescript example of generating an Ed25519 key pair with a BIP-0039 mnemonic phrase using the libraries bip39 and ed25519 as dependencies is shown below:

.. literalinclude:: ../../examples/snippets/create-key-from-mnemonic-phrase.ts
   :language: typescript
   :dedent:

Choosing a party hint
---------------------
The unique party id is defined as **${partyHint}::${fingerprint}**. The partyHint is a user friendly name and can be anything that is unique for the fingerprint, e.g. "alice", "bob" or "my-wallet-1".

If you want to be to derive your party IDs from the public key, you can use a static party hint for all parties with different fingerprints, or also derive party hint from the public key, too.

Generate the fingerprint
------------------------

The wallet SDK has a built in function to generate the fingerprint:

.. literalinclude:: ../../examples/snippets/generate-fingerprint.ts
   :language: typescript
   :dedent:

this can be used to determine the unique party id beforehand or recompute the fingerprint based on the public key.

Generating the topology transactions
------------------------------------
When onboarding using external signing, multiple topology transactions are required to be generated and signed.
This is because both the keyHolder (the party) and the node (the validator) need to agree on the hosting relationship.
The three transactions that needs to be generated are:

- `PartyToParticipant`: This transaction indicates that the party agrees to be hosted by the participant (validator).
- `ParticipantToParty`: This transaction indicates that the participant (validator) agrees to host the party.
- `KeyToParty`: This transaction indicates that the key (public key) is associated with the party.

Once all the transactions are built they can be combined into a single hash and submitted as part of a single signature.
The wallet SDK has helper functions to generate these transactions:

.. literalinclude:: ../../examples/snippets/create-topology-transactions.ts
   :language: typescript
   :dedent:

Decoding the topology transactions
----------------------------------
Sometimes converting the topology transactions to human readable json might be needed, for this you can use the decodeTopologyTx function:

.. literalinclude:: ../../examples/snippets/decode-topology-tx.ts
   :language: typescript
   :dedent:

Sign multi-hash
---------------
Since the topology transactions need to be submitted together the combined hash needs to be signed.
The wallet SDK has a helper function to sign the combined hash:

.. literalinclude:: ../../examples/snippets/sign-party-transaction-hash.ts
   :language: typescript
   :dedent:

Submit the topology transactions
---------------------------------
Once the signature is generated, the topology transactions can be submitted to the validator.
The wallet SDK has a helper function to submit the transactions:

.. literalinclude:: ../../examples/snippets/submit-signed-topology-transaction.ts
   :language: typescript
   :dedent:

Multi-hosting a party
---------------------
Since only relevant data is shared between validator nodes, and nodes don't contain all data, backup and recovery are important.
Another important aspect is to prevent having a validator being a single source of failure, this can be handled on a party basis by
doing multi hosting. Multi hosting of a party means replication of all the information related to that party onto multiple validators,
this can either be multiple validators run by the same entity (most common case for wallets) or even validators run by different
entities in case of malicious actors.

To facilitate multi-hosting we simply need to extend `partyToParticipant` and `ParticipantToParty` to include new validators. This
requires sourcing signed transaction from the validators the client is interested in being hosted on.

The below script allows you (by using the SDK) to host a single party on both `app-user` and `app-provider` validators.

.. literalinclude:: ../../examples/scripts/06-multi-hosted-party.ts
   :language: typescript
   :dedent:

Using the `userLedgerControllers` party allocation we only need to specify other validators the party is hosted on. The default is `app-user`,
however if you do the onboarding using the `topologyController` legacy variant, then you would also need to supply configurations for the `app-user`.
