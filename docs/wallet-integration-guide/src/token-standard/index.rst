..
   Copyright (c) 2024 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
..
   SPDX-License-Identifier: Apache-2.0

.. #TODO: copy of https://raw.githubusercontent.com/hyperledger-labs/splice/3c0770e648b21a48ef8dde202ef27065592f9422/docs/src/deployment/traffic.rst

.. _token_standard:

Token Standard
==============

The Wallet SDK support performing basic token standard operations, these are exposed through the `sdk.tokenStandard` a complete
overview of the underlying integration can be found `here <https://docs.sync.global/app_dev/token_standard/index.html#>` and the CIP
is defined `here <https://github.com/global-synchronizer-foundation/cips/blob/main/cip-0056/cip-0056.md>`.


How do i quickly perform a transfer between two parties?
--------------------------------------------------------

The below performs a 2-step transfer between Alice and Bob and expose their holdings:

.. literalinclude:: ../../examples/scripts/04-token-standard-localnet.ts
    :language: typescript
    :dedent:

Listing holdings (UTXO's)
-------------------------

Canton uses created and archived events to determine the state of the ledger. This correlates to how UTXO's are handled on other blockchains
liked Bitcoin. This means that


