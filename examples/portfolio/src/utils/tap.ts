// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { pino } from 'pino'
import { v4 } from 'uuid'
import { TokenStandardClient } from '@canton-network/core-token-standard'
import { ScanProxyClient } from '@canton-network/core-splice-client'

export const tap = async (party: string, sessionToken: string) => {
    const logger = pino({ name: 'main', level: 'debug' })
    const tokenStandardClient = new TokenStandardClient(
        'http://scan.localhost:4000',
        logger,
        false // isAdmin
    )
    const scanProxyClient = new ScanProxyClient(
        new URL('http://localhost:2000/api/validator'),
        logger,
        false, // isAdmin
        sessionToken
    )
    const REQUESTED_AT_SKEW_MS = 60_000
    const registryInfo = await tokenStandardClient.get(
        '/registry/metadata/v1/info'
    )
    const instrumentAdmin = registryInfo.adminId
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const choiceArgs = {
        expectedAdmin: instrumentAdmin,
        transfer: {
            sender: instrumentAdmin,
            receiver: party,
            amount: 10000,
            instrumentId: { admin: instrumentAdmin, id: 'Amulet' },
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
    const transferFactory = await tokenStandardClient.post(
        '/registry/transfer-instruction/v1/transfer-factory',
        {
            choiceArguments: choiceArgs as unknown as Record<string, never>,
        }
    )
    const disclosedContracts = transferFactory.choiceContext.disclosedContracts
    console.log('disclosedContracts', disclosedContracts)

    const amuletRules = await scanProxyClient.getAmuletRules()
    console.log('amuletRules', amuletRules)

    const latestOpenMiningRound =
        await scanProxyClient.getActiveOpenMiningRound()
    console.log('latestOpenMiningRound', latestOpenMiningRound)

    const tapCommand = {
        templateId: amuletRules.template_id!,
        contractId: amuletRules.contract_id,
        choice: 'AmuletRules_DevNet_Tap',
        choiceArgument: {
            receiver: choiceArgs.transfer.receiver,
            amount: choiceArgs.transfer.amount,
            openRound: latestOpenMiningRound!.contract_id,
        },
    }

    const request = {
        commands: [{ ExerciseCommand: tapCommand }],
        commandId: v4(),
        actAs: [party],
        disclosedContracts,
        // userId
        // synchronizerId
    }

    const provider = window.canton
    const result = await provider?.request({
        method: 'prepareExecute',
        params: request,
    })
    console.log(result)
}
