// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Logger } from 'pino'
import { TestToken } from '@canton-network/core-splice-codegen'
import type { MultiSyncSetup } from './_setup.js'
import { BOB_TOKEN_MINT_AMOUNT } from './_constants.js'

/**
 * Mints TestTokens for the TokenAdmin and offers them to Bob via the registry's
 * transfer-instruction-v1 API, which Bob then accepts. Assumes the TestToken
 * `TokenRules` contracts already exist (created by the registry on start-up).
 */
export async function mintAndTransferTokenToBob(
    setup: MultiSyncSetup,
    logger: Logger
): Promise<void> {
    const { bobSdk, tokenAdminSdk, bob, tokenAdmin, appSynchronizerId } = setup

    // The TestToken registry URL comes from the SDK's own configured registries
    // (`token.find` resolves assets from the registries passed to `SDK.create`),
    // so it no longer needs to be threaded through the setup object.
    const { registryUrl } = await tokenAdminSdk.token.find(
        TestToken.DAR.TestTokenID
    )

    await tokenAdminSdk.ledger
        .prepare({
            partyId: tokenAdmin.partyId,
            commands: [
                TestToken.commands.create.token({
                    owner: tokenAdmin.partyId,
                    amount: BOB_TOKEN_MINT_AMOUNT,
                    instrumentId: {
                        admin: tokenAdmin.partyId,
                    },
                }),
            ],
            disclosedContracts: [],
            synchronizerId: appSynchronizerId,
        })
        .sign(tokenAdmin.keyPair.privateKey)
        .execute({ partyId: tokenAdmin.partyId })

    const adminTokenHoldings =
        await tokenAdminSdk.ledger.acsReader.raw.readJsContracts({
            templateIds: [TestToken.DAR.TestTokenV1.Token.templateId],
            parties: [tokenAdmin.partyId],
            filterByParty: true,
        })
    const adminTokenCid = adminTokenHoldings[0]?.contractId
    if (!adminTokenCid)
        throw new Error('TokenAdmin Token holding not found after mint')

    // TokenAdmin offers the freshly-minted TestToken to Bob. The transfer factory
    // and choice context come from the registry's transfer-instruction-v1 API
    const [transferCommand, transferDisclosed] =
        await tokenAdminSdk.token.transfer.create({
            sender: tokenAdmin.partyId,
            recipient: bob.partyId,
            amount: BOB_TOKEN_MINT_AMOUNT,
            instrumentId: TestToken.DAR.TestTokenID,
            registryUrl,
            inputUtxos: [adminTokenCid],
        })

    await tokenAdminSdk.ledger
        .prepare({
            partyId: tokenAdmin.partyId,
            commands: [transferCommand],
            disclosedContracts: transferDisclosed,
            synchronizerId: appSynchronizerId,
        })
        .sign(tokenAdmin.keyPair.privateKey)
        .execute({ partyId: tokenAdmin.partyId })

    const transferOffers = await bobSdk.ledger.acsReader.raw.readJsContracts({
        templateIds: [TestToken.DAR.TestTokenV1.TokenTransferOffer.templateId],
        parties: [bob.partyId],
        filterByParty: true,
    })
    const transferOfferCid = transferOffers[0]?.contractId
    if (!transferOfferCid)
        throw new Error('TokenTransferOffer not found for Bob')

    // Bob accepts the transfer offer using the registry's transfer-instruction-v1
    // accept choice context.
    const [acceptCommand, acceptDisclosed] = await bobSdk.token.transfer.accept(
        {
            transferInstructionCid: transferOfferCid,
            registryUrl,
        }
    )

    await bobSdk.ledger
        .prepare({
            partyId: bob.partyId,
            commands: [acceptCommand],
            disclosedContracts: acceptDisclosed,
            synchronizerId: appSynchronizerId,
        })
        .sign(bob.keyPair.privateKey)
        .execute({ partyId: bob.partyId })

    logger.info(
        `Bob: ${BOB_TOKEN_MINT_AMOUNT} TestToken minted on app-synchronizer via registry transfer-factory`
    )
}
