// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { ScanProxyClient } from '@canton-network/core-splice-client'
import {
    ExerciseCommand,
    DisclosedContract,
    TokenStandardService,
} from './token-standard-service.js'

// TODO: This appears in a couple of places, either move it somewhere more
// central, or as part of the Service class hierarchy
const REQUESTED_AT_SKEW_MS = 60_000

/** AmuletService extends TokenStandardService to provide features that are
 *  available for amulet but not in the token standard, such as:
 *
 *   - Tapping
 *   - Transfer preapprovals
 *   - Featured apps
 */
export class AmuletService {
    constructor(
        readonly tokenStandard: TokenStandardService,
        private readonly scanProxyClient: ScanProxyClient
    ) {}

    // TODO(#583) as it's not a part of token standard, should be moved somewhere else
    async createTap(
        receiver: string,
        amount: string,
        instrumentAdmin: string, // TODO (#907): replace with registry call
        instrumentId: string,
        registryUrl: string
    ): Promise<[ExerciseCommand, DisclosedContract[]]> {
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        const choiceArgs = {
            expectedAdmin: instrumentAdmin,
            transfer: {
                sender: instrumentAdmin,
                receiver,
                amount,
                instrumentId: { admin: instrumentAdmin, id: instrumentId },
                lock: null,
                requestedAt: new Date(
                    Date.now() - REQUESTED_AT_SKEW_MS
                ).toISOString(),
                executeBefore: tomorrow.toISOString(),
                inputHoldingCids: [],
                meta: { values: {} },
            },
            extraArgs: {
                context: { values: {} },
                meta: { values: {} },
            },
        }

        const disclosedContracts = (
            await this.tokenStandard.transfer.fetchTransferFactoryChoiceContext(
                registryUrl,
                choiceArgs
            )
        ).choiceContext.disclosedContracts

        const amuletRules = await this.scanProxyClient.getAmuletRules()
        if (!amuletRules) {
            throw new Error('AmuletRules contract not found')
        }

        const latestOpenMiningRound =
            await this.scanProxyClient.getActiveOpenMiningRound()
        if (!latestOpenMiningRound) {
            throw new Error(
                'OpenMiningRound active at current moment not found'
            )
        }

        return [
            {
                templateId: amuletRules.template_id!,
                contractId: amuletRules.contract_id,
                choice: 'AmuletRules_DevNet_Tap',
                choiceArgument: {
                    receiver,
                    amount,
                    openRound: latestOpenMiningRound.contract_id,
                },
            },
            disclosedContracts,
        ]
    }
}
