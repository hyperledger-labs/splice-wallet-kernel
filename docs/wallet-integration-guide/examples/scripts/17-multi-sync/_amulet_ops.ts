// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Logger } from 'pino'
import {
    localNetStaticConfig,
    resolveCapabilities,
} from '@canton-network/wallet-sdk'
import type { MultiSyncSetup } from './_setup.js'
import { ALICE_AMULET_TAP_AMOUNT } from './_constants.js'

export async function mintAmuletForAlice(
    setup: MultiSyncSetup,
    logger: Logger
): Promise<void> {
    const { aliceSdk, alice, globalSynchronizerId } = setup
    const [aliceTapCreateCommand, aliceTapCreateDisclosedContracts] =
        await aliceSdk.amulet.tap(alice.partyId, ALICE_AMULET_TAP_AMOUNT)

    await aliceSdk.ledger
        .prepare({
            partyId: alice.partyId,
            commands: aliceTapCreateCommand,
            disclosedContracts: aliceTapCreateDisclosedContracts,
            synchronizerId: globalSynchronizerId,
        })
        .sign(alice.keyPair.privateKey)
        .execute({ partyId: alice.partyId })

    logger.info(
        `Alice: Amulet minted (${ALICE_AMULET_TAP_AMOUNT}) on global synchronizer`
    )
}

export async function allocateAmuletForAlice(
    setup: MultiSyncSetup,
    logger: Logger
): Promise<string> {
    const { aliceSdk, alice, globalSynchronizerId, amuletAdmin } = setup

    const pendingRequests = await aliceSdk.token.v1.allocation.request.pending(
        alice.partyId
    )
    const requestView = pendingRequests[0].interfaceViewValue!
    const legId = Object.keys(requestView.transferLegs).find(
        (key) => requestView.transferLegs[key].sender === alice.partyId
    )!
    if (!legId) throw new Error('No transfer leg found for Alice')

    const amuletHoldings = await aliceSdk.token.v1.utxos.list({
        partyId: alice.partyId,
        includeLocked: false,
    })
    const amuletHoldingCid = amuletHoldings.find(
        (holding) =>
            holding.interfaceViewValue.instrumentId.id === 'Amulet' &&
            holding.interfaceViewValue.instrumentId.admin === amuletAdmin
    )?.contractId
    if (!amuletHoldingCid) throw new Error('Amulet holding not found for Alice')

    const [command, disclosedContracts] =
        await aliceSdk.token.v1.allocation.instruction.create({
            allocationSpecification: {
                settlement: requestView.settlement,
                transferLegId: legId,
                transferLeg: requestView.transferLegs[legId],
            },
            asset: {
                id: 'Amulet',
                displayName: 'Amulet',
                symbol: 'CC',
                registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
                admin: amuletAdmin,
                capabilities: resolveCapabilities({
                    supportedApis: {
                        'splice-api-token-transfer-instruction-v2': 1,
                        'splice-api-token-allocation-v1': 1,
                        'splice-api-token-holding-v2': 1,
                        'splice-api-token-allocation-instruction-v2': 1,
                        'splice-api-token-metadata-v1': 1,
                        'splice-api-token-allocation-v2': 1,
                        'splice-api-token-transfer-events-v2': 1,
                        'splice-api-token-transfer-instruction-v1': 1,
                        'splice-api-token-holding-v1': 1,
                        'splice-api-token-allocation-instruction-v1': 1,
                    },
                }),
            },
            inputUtxos: [amuletHoldingCid],
            requestedAt: new Date().toISOString(),
        })

    await aliceSdk.ledger
        .prepare({
            partyId: alice.partyId,
            commands: [command],
            disclosedContracts,
            synchronizerId: globalSynchronizerId,
        })
        .sign(alice.keyPair.privateKey)
        .execute({ partyId: alice.partyId })

    logger.info('Alice: Amulet allocated for leg-0 (global synchronizer)')
    return legId
}
