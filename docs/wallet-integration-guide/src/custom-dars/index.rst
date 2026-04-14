..
   Copyright (c) 2024 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
..
   SPDX-License-Identifier: Apache-2.0

.. _custom_dars:

Custom DAR Integration
======================

A key aspect of building applications is using custom DARs and the related code-generated typescript bindings.
This section provides guidance on how to integrate with custom DARs in a way that is maintainable and extenable.


Quick Example
-----------------------

.. literalinclude:: ../../examples/scripts/14-token-standard-allocation-custom-dars.ts
    :language: typescript
    :dedent:

This example demonstrates a full OTC-style flow where a custom trading app DAR (in this case the `Splice.Testing.Apps.TradingApp` from splice repo) is used while Alice and Bob still perform
allocation through token standard APIs.

Recommended implementation steps
----------------------------------

1. Upload the DAR before submitting custom template commands.
2. Import generated bindings from the code-generated package.
3. Use generated ``templateId``  and ``choiceName`` allows you to use type-strong create commands like:

    .. code-block:: typescript
    
        commands: {
            CreateCommand: {
                templateId: OTCTradeProposal.templateId,
                createArguments: {
                    venue: venue.partyId,
                    tradeCid: null,
                    transferLegs,
                    approvers: [alice.partyId, bob.partyId],
                },
            },
        },
4. use ``toTemplateContracts`` and ``toTemplateContract`` to easily convert ACS responses to type-strong objects like:

    .. code-block:: typescript
    
        const proposalsForBob = toTemplateContracts<
                                    TradingApp.OTCTradeProposal,
                                    AcsReadContract
                                >(
                                    await sdk.ledger.acs.read({
                                        templateIds: [OTCTradeProposal.templateId],
                                        parties: [bob.partyId],
                                        filterByParty: true,
                                    }),
                                    OTCTradeProposal.templateId
                                )