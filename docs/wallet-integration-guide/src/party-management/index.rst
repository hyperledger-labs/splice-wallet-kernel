
Creating an External Party (Wallet)
========================

Overview
--------
This document describes the steps required to create a new party (wallet/address) on a validator.
Parties represent acting entites in the network and all transaction happens between one or more parties. parties comes in two forms, internal and external.
An internal party is created and signed using the Validators own internal keys for signing (and thereby the validator operator has full control of everything that happens on the party).
The alternative is to create an external party, an external party is similar to how node interactions happens on other networks. In this case the signing key can be held
externally and a signature is required alongside the transaction to authorize the action. For external parties the base flow follows three steps: Prepare a transaction, sign the transaction and submit the transaction.

*This document focuses on the steps required to create an external party using the Wallet SDK.*

How do i quickly allocate a party?
-----------------------------------
Using the wallet SDK you can quickly allocate a party using the following code snippet:

.. tabs::

   .. tab:: Default (using Oauth)

      .. literalinclude:: ../../examples/01-auth.ts
         :language: typescript
         :dedent:

   .. tab:: Localnet By Splice

      .. literalinclude:: ../../examples/02-auth-localnet.ts
         :language: javascript
         :dedent:

Create the key Pair
-------------------
Creating key follow standard encryption practices similarly to other blockchains. The full details of supported cryptographic algorithms can be found `Here <https://docs.daml.com/canton/usermanual/security.html#common-node-keys>`_.
by default a **Ed25519** is used. There exists many libraries that can be used to generate such a key pair, you can do it simply with the WalletSDK using:

.. code-block:: javascript

   import { TopologyController } from "@splice/wallet-sdk";
    // static method call
    const {publicKey, privateKey } = TopologyController.createNewKeyPair()


Generate the fingerprint
--------------------------------
A party is defined as ${partyHint}::${fingerprint} where the fingerprint is a sha256 hash of the public key prefixed with '12' (as indicated by the `hash purpose <https://github.com/digital-asset/canton/blob/8ee65155e7f866e1f420703c376c867336b75088/community/base/src/main/scala/com/digitalasset/canton/crypto/HashPurpose.scala#L63>`_).
The partyHint is a user friendly name for the party and can be anything that is unique for the fingerprint, e.g. "alice", "bob" or "my-wallet-1".

The wallet SDK has fingerprint generation built in:

.. code-block:: javascript

   import { TopologyController } from "@splice/wallet-sdk";
    // static method call
    const fingerPrint = TopologyController.createFingerprintFromPublicKey(publicKey)



Generating the topology transactions
------------------------------------
When onboarding using external signing, multiple topology transactions are required to be generated and signed in order to facilitate this.
This is because both the keyHolder (the party) and the node (the validator) needs to agree on the hosting relationship.
The three transactions that needs to be generated are:
- PartyToParticipant: This transaction indicates that the party agrees to be hosted by the participant (validator).
- ParticipantToParty: This transaction indicates that the participant (validator) agrees to host the party.
- KeyToParty: This transaction indicates that the key (public key) is associated with the party.

Once all the transactions are build they can be combined into a single hash and submitted as part of a single signature.
The wallet SDK has helper functions to generate these transactions:

.. code-block:: javascript

    import { WalletSDKImpl, TopologyController } from "@splice/wallet-sdk";

    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localAuthDefault, // or use your specific configuarion
        ledgerFactory: localLedgerDefault, // or use your specific configuarion
        topologyFactory: localTopologyDefault, // or use your specific configuarion
    })

    const {publicKey, privateKey } = TopologyController.createNewKeyPair()
    //partyHint is optional but recommended to make it easier to identify the party
    const partyHint = "my-wallet-1"
    const preparedParty = await sdk.topology?.prepareExternalPartyTopology(publicKey, partyHint)


preparedParty will have the following structure:

.. code-block:: javascript

    export type PreparedParty = {
    partyTransactions: Uint8Array<ArrayBufferLike>[] // Array of the three topology transactions
    combinedHash: string // sha256 hash of the three transactions that needs to be signed
    txHashes: Buffer<ArrayBuffer>[] // Array of the three transaction hashes
    namespace: string // the namespace of the party
    partyId: string // the partyId as defined by ${partyHint}::${fingerprint}
    }

Sign multi-hash
-----------------
Since the topology transactions need to be submitted together the combined hash needs to be signed.
The wallet SDK has a helper function to sign the combined hash:

.. code-block:: javascript

    import { signTransactionHash } from "@splice/wallet-sdk";

    const signature = await signTransactionHash(preparedParty.combinedHash, privateKey)

Submit the topology transactions
---------------------------------
Once the signature is generated the topology transactions can be submitted to the validator.
The wallet SDK has a helper function to submit the transactions:

.. code-block:: javascript

    import { WalletSDKImpl, TopologyController } from "@splice/wallet-sdk";


    // it is important to configure the SDK correctly else you might run into connectivity or authentication issues
    const sdk = new WalletSDKImpl().configure({
        logger: console,
        authFactory: localAuthDefault, // or use your specific configuarion
        ledgerFactory: localLedgerDefault, // or use your specific configuarion
        topologyFactory: localTopologyDefault, // or use your specific configuarion
    })


    sdk.topology?.submitExternalPartyTopology(
        signature
        preparedParty
    )


.. TODO party-key-mapping