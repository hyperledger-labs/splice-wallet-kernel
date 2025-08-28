Create an External Party (Wallet)
========================

Overview
--------
This document describes the steps required to create a new party (wallet/address) on a validator.
Parties represent acting entites in the network and all transaction happens between one or more parties.
To understand more about parties see `Parties section here <parties>`_.

This shows the steps required to create an external party using examples from the Wallet SDK, and in python and back from the
detailed External Signing Tutorial which can be seen `here <https://docs.digitalasset.com/build/3.3/tutorials/app-dev/external_signing_onboarding.html>`_.

Quickly allocating a party using the Wallet SDK
-----------------------------------------------
Using the wallet SDK you can quickly allocate a party using the following code snippet:

.. tabs::

    .. tab:: Quick using Splice LocalNet

        .. literalinclude:: ../../examples/snippets/allocate-party.ts
            :language: typescript
            :dedent:

    .. tab:: Comprehensive using OAuth

        .. literalinclude:: ../../examples/scripts/01-auth.ts
            :language: typescript
            :dedent:

    .. tab:: Comprehensive using Splice LocalNet

        .. literalinclude:: ../../examples/scripts/02-auth-localnet.ts
            :language: typescript
            :dedent:

Create the key Pair
-------------------
The process for creating a key using standard encryption practices is similar that in other blockchains. The full details of supported cryptographic algorithms can be found `Here <https://docs.daml.com/canton/usermanual/security.html#common-node-keys>`_.
By default an **Ed25519** encryption is used. There exists many libraries that can be used to generate such a key pair, you can do it simply with the WalletSDK using:

.. tabs::

    .. tab:: JS SDK

      .. literalinclude:: ../../examples/snippets/create-key-pair.ts
         :language: typescript
         :dedent:

    .. tab:: Python
      
      .. literalinclude:: ../../examples/snippets/python/create-key-pair.py
         :language: python
         :dedent:

    .. tab:: Bash
      
      .. literalinclude:: ../../examples/snippets/bash/create-key-pair.sh
         :language: bash
         :dedent:

Choosing a party hint
---------------------
A party ID is defined as **${partyHint}::${fingerprint}**. The partyHint is a user friendly name for the party and can be anything that is unique for the fingerprint, e.g. "alice", "bob" or "my-wallet-1".

If you want to be to derive your party IDs from the public key, you can use a static party hint for all parties with different fingerprints, or also derive party hint from the public key, too.

Generate the fingerprint
------------------------

Below are examples of how to generate the fingerprint.

.. tabs::

    .. tab:: JS SDK

      .. literalinclude:: ../../examples/snippets/generate-fingerprint.ts
         :language: typescript
         :dedent:

    .. tab:: Python

      .. literalinclude:: ../../examples/snippets/python/generate-fingerprint.py
         :language: python
         :dedent:

    .. tab:: Bash

      .. literalinclude:: ../../examples/snippets/bash/generate-fingerprint.sh
         :language: bash
         :dedent:

Generating the topology transactions
------------------------------------
When onboarding using external signing, multiple topology transactions are required to be generated and signed.
This is because both the keyHolder (the party) and the node (the validator) need to agree on the hosting relationship.
The three transactions that needs to be generated are:

- PartyToParticipant: This transaction indicates that the party agrees to be hosted by the participant (validator).
- ParticipantToParty: This transaction indicates that the participant (validator) agrees to host the party.
- KeyToParty: This transaction indicates that the key (public key) is associated with the party.

Once all the transactions are built they can be combined into a single hash and submitted as part of a single signature.
Below are examples of how to generate the topology transactions:

.. tabs::

    .. tab:: JS SDK

      .. literalinclude:: ../../examples/snippets/create-topology-transactions.ts
         :language: typescript
         :dedent:

    .. tab:: Python

      .. literalinclude:: ../../examples/snippets/python/create-topology-transactions.py
         :language: python
         :dedent:


.. Do we have a bash example?

Sign multi-hash
-----------------
Since the topology transactions need to be submitted together the combined hash needs to be signed.
The wallet SDK has a helper function to sign the combined hash:

.. tabs::

    .. tab:: JS SDK

      .. literalinclude:: ../../examples/snippets/sign-party-transaction-hash.ts
         :language: typescript
         :dedent:

    .. tab:: Python

      .. literalinclude:: ../../examples/snippets/python/sign-party-transaction-hash.py
         :language: python
         :dedent:

.. Do we have a bash example?

Submit the topology transactions
---------------------------------
Once the signature is generated, the topology transactions can be submitted to the validator.
The wallet SDK has a helper function to submit the transactions:


.. tabs::

    .. tab:: JS SDK

      .. literalinclude:: ../../examples/snippets/submit-signed-topology-transaction.ts
         :language: typescript
         :dedent:

    .. tab:: Python

      .. literalinclude:: ../../examples/snippets/python/submit-signed-topology-transaction.py
         :language: python
         :dedent:

.. Again, do we have a bash example?
