// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { v4 } from 'uuid'
import type { PartyId } from '@canton-network/core-types'
import { resolveTokenStandardService } from '../services'

export const acceptTransfer = async ({
    registryUrls,
    party,
    contractId,
    instrumentId,
}: {
    registryUrls: Map<PartyId, string>
    party: PartyId
    contractId: string
    instrumentId: { admin: string; id: string }
}) => {
    // TODO: resolve this BEFORE calling this function so we can gray out the
    // button?
    const registryUrl = registryUrls.get(instrumentId.admin)
    if (!registryUrl)
        throw new Error(`no registry URL for admin ${instrumentId.admin}`)

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
