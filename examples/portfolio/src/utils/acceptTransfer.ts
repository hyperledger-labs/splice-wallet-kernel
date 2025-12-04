// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { v4 } from 'uuid'
import type { PartyId } from '@canton-network/core-types'
import { resolveTokenStandardService } from '../services'

export const acceptTransfer = async ({
    party,
    contractId,
}: {
    party: PartyId
    contractId: string
}) => {
    const registryUrl = 'http://scan.localhost:4000'
    const tokenStandardService = await resolveTokenStandardService()
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
