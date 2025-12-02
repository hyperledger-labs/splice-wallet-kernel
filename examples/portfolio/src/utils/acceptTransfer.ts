// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { pino } from 'pino'
import { v4 } from 'uuid'
import type { PartyId } from '@canton-network/core-types'
import { createTokenStandardService } from './createClients.js'

export const acceptTransfer = async ({
    sessionToken,
    party,
    contractId,
}: {
    sessionToken: string
    party: PartyId
    contractId: string
}) => {
    const logger = pino({ name: 'main', level: 'debug' })
    const registryUrl = 'http://scan.localhost:4000'
    const { tokenStandardService } = await createTokenStandardService({
        logger,
        sessionToken,
    })
    const [acceptCommand, disclosedContracts] =
        await tokenStandardService.transfer.createAcceptTransferInstruction(
            contractId,
            registryUrl
        )

    const request = {
        commands: [{ ExerciseCommand: acceptCommand }],
        commandId: v4(),
        actAs: [party],
        disclosedContracts,
    }

    const provider = window.canton
    const result = await provider?.request({
        method: 'prepareExecute',
        params: request,
    })
    console.log(result)
}
