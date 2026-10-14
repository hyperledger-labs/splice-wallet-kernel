---
title: 'Creating an External Party'
description: 'Create and onboard an external party: key pairs, mnemonics, party hints, fingerprints, and topology transactions.'
---

## Overview

Parties represent acting entities in the network and all transaction happens between one or more parties. To understand more about parties see the Parties in the Overview.

A detailed tutorial of the steps below can be seen in the External Signing Tutorial [here](https://docs.canton.network/appdev/deep-dives/external-signing-onboarding) using python example scripts.

_This document focuses on the steps required to create an external party using the Wallet SDK._

## How do I quickly allocate a party?

Using the wallet SDK you can quickly allocate a party using the following code snippet:

<!-- tabs -->
<!-- tab: Quick using Splice LocalNet -->

**Quick using Splice LocalNet**

[`snippets/allocate-party.ts`](../../examples/snippets/allocate-party.ts) <!-- include -->

<!-- tab: Comprehensive using Splice LocalNet -->

**Comprehensive using Splice LocalNet**

[`scripts/01-init.ts`](../../examples/scripts/01-init.ts) <!-- include -->

<!-- /tabs -->

## Create a key pair

The process for creating a key using standard encryption practices is similar that in other blockchains. The full details of supported cryptographic algorithms can be found [Here](https://docs.canton.network/overview/learn/cryptographic-keys). By default an **Ed25519** encryption is used. There exists many libraries that can be used to generate such a key pair, you can do it simply with the WalletSDK using:

[`snippets/create-key-pair.ts`](../../examples/snippets/create-key-pair.ts) <!-- include -->

### Generating Keys from a Mnemonic Phrase (BIP-0039)

The Canton Network supports the generation of cryptographic keys using a mnemonic code or mnemonic sentence, following the [BIP-0039 standard](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki).

Using a mnemonic phrase allows for deterministic key generation, which simplifies the backup and recovery process. Instead of managing individual private key files, you can recreate your keys across different environments using a human-readable sequence of words.

A typescript example of generating an Ed25519 key pair with a BIP-0039 mnemonic phrase using the libraries bip39 and ed25519 as dependencies is shown below:

[`snippets/create-key-from-mnenomic-phrase.ts`](../../examples/snippets/create-key-from-mnenomic-phrase.ts) <!-- include -->

## Choosing a party hint

The unique party id is defined as **\${partyHint}::\${fingerprint}**. The partyHint is a user friendly name and can be anything that is unique for the fingerprint, e.g. "alice", "bob" or "my-wallet-1". It is recommended to include a hint when setting up the party (see `quick-party-allocation` for an example).

## Generate the fingerprint

The wallet SDK has a built in function to generate the fingerprint:

[`snippets/generate-fingerprint.ts`](../../examples/snippets/generate-fingerprint.ts) <!-- include -->

this can be used to determine the unique party id beforehand or recompute the fingerprint based on the public key.

## Generating the topology transactions

When onboarding using external signing, multiple topology transactions are required to be generated and signed. This is because both the keyHolder (the party) and the node (the validator) need to agree on the hosting relationship. The three transactions that needs to be generated are:

- `PartyToParticipant`: This transaction indicates that the party agrees to be hosted by the participant (validator).
- `ParticipantToParty`: This transaction indicates that the participant (validator) agrees to host the party.
- `KeyToParty`: This transaction indicates that the key (public key) is associated with the party.

Once all the transactions are built they can be combined into a single hash and submitted as part of a single signature. The wallet SDK has helper functions to generate these transactions:

[`snippets/create-topology-transactions.ts`](../../examples/snippets/create-topology-transactions.ts) <!-- include -->

## Decoding the topology transactions

Sometimes converting the topology transactions to human readable json might be needed, for this you can use the `.decode()` function:

[`snippets/decode-transaction.ts`](../../examples/snippets/decode-transaction.ts) <!-- include -->

## Sign multi-hash

Since the topology transactions need to be submitted together the combined hash needs to be signed. The wallet SDK has a helper function to sign the combined hash:

[`snippets/sign-transaction-hash.ts`](../../examples/snippets/sign-transaction-hash.ts) <!-- include -->

## Submit the topology transactions

Once the signature is generated, the topology transactions can be submitted to the validator. The wallet SDK has a helper function to submit the transactions:

[`snippets/submit-signed-topology-transaction.ts`](../../examples/snippets/submit-signed-topology-transaction.ts) <!-- include -->

## Multi-hosting a party

Since only relevant data is shared between validator nodes, and nodes don't contain all data, backup and recovery are important. Another important aspect is to prevent having a validator being a single source of failure, this can be handled on a party basis by doing multi hosting. Multi hosting of a party means replication of all the information related to that party onto multiple validators, this can either be multiple validators run by the same entity (most common case for wallets) or even validators run by different entities in case of malicious actors.

To facilitate multi-hosting we simply need to extend `partyToParticipant` and `ParticipantToParty` to include new validators. This requires sourcing signed transaction from the validators the client is interested in being hosted on.

The below script allows you (by using the SDK) to host a single party on both `app-user` and `app-provider` validators.

[`scripts/03-parties.ts`](../../examples/scripts/03-parties.ts) <!-- include -->
