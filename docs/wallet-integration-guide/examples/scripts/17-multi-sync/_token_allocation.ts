// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Logger } from 'pino'
import type { MultiSyncSetup } from './_setup.js'
import { TestToken } from '@canton-network/core-splice-codegen'
import { pollUntilFound } from './_poll.js'

export async function allocateTokenForBob(
    setup: MultiSyncSetup,
    logger: Logger
): Promise<{ legId: string }> {
    const { bobSdk, tokenAdminSdk, bob, tokenAdmin, appSynchronizerId } = setup

    // Resolve the TestToken registry URL from the SDK's configured registries
    // (`token.find`) rather than passing it in through the setup object.
    const asset = await bobSdk.token.find(TestToken.DAR.TestTokenID)

    // The TradingApp creates the allocation request on another participant
    const request = await pollUntilFound(
        async () =>
            (await bobSdk.token.v1.allocation.request.pending(bob.partyId))[0],
        'Allocation request not found for Bob'
    )
    const requestView = request.interfaceViewValue!
    const legId = Object.keys(requestView.transferLegs).find(
        (key) => requestView.transferLegs[key].sender === bob.partyId
    )!
    if (!legId) throw new Error('No transfer leg found for Bob')

    const tokenHoldings = await bobSdk.ledger.acsReader.raw.readJsContracts({
        templateIds: [TestToken.DAR.TestTokenV1.Token.templateId],
        parties: [bob.partyId],
        filterByParty: true,
    })

    const tokenHolding = tokenHoldings[0]
    if (!tokenHolding) throw new Error('Token holding not found for Bob')

    // Verify that the TokenRules factory for the app synchronizer is available.
    const appTokenRules = (
        await tokenAdminSdk.ledger.acsReader.raw.readJsContracts({
            templateIds: [TestToken.DAR.TestTokenV1.TokenRules.templateId],
            parties: [tokenAdmin.partyId],
            filterByParty: true,
        })
    ).find((c) => c.synchronizerId === appSynchronizerId)
    if (!appTokenRules)
        throw new Error('TokenRules not found on app synchronizer')

    const [command, disclosedContracts] =
        await tokenAdminSdk.token.v1.allocation.instruction.create({
            allocationSpecification: {
                settlement: requestView.settlement,
                transferLegId: legId,
                transferLeg: requestView.transferLegs[legId],
            },
            asset,
            inputUtxos: [tokenHolding.contractId],
            requestedAt: new Date(Date.now() - 5).toISOString(),
        })

    await bobSdk.ledger
        .prepare({
            partyId: bob.partyId,
            commands: [command],
            disclosedContracts,
            synchronizerId: appSynchronizerId,
        })
        .sign(bob.keyPair.privateKey)
        .execute({ partyId: bob.partyId })

    logger.info(
        'Bob: TestToken allocated for leg-1 (app-synchronizer, single-party) via registry allocation-factory'
    )
    return { legId }
}
