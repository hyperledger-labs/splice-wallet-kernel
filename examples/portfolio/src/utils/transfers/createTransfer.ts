// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { v4 } from 'uuid'
import { PartyId } from '@canton-network/core-types'
import { resolveTokenStandardService } from '../../services'

export const createTransfer = async ({
    registryUrls,
    sender,
    receiver,
    instrumentId,
    amount,
    inputUtxos,
    memo,
}: {
    registryUrls: Map<PartyId, string>
    sender: PartyId
    receiver: PartyId
    instrumentId: { admin: PartyId; id: string }
    amount: number
    inputUtxos?: string[]
    memo?: string
}) => {
    const registryUrl = registryUrls.get(instrumentId.admin)
    if (!registryUrl)
        throw new Error(`no registry URL for admin ${instrumentId.admin}`)
    const tokenStandardService = await resolveTokenStandardService()

    const [transferCommand, disclosedContracts] =
        await tokenStandardService.transfer.createTransfer(
            sender,
            receiver,
            `${amount}`,
            instrumentId.admin,
            instrumentId.id,
            registryUrl,
            inputUtxos,
            memo,
            undefined, // expiryDate
            undefined, // Metadata
            undefined // prefetchedRegistryChoiceContext
        )

    const request = {
        commands: [{ ExerciseCommand: transferCommand }],
        commandId: v4(),
        actAs: [sender],
        disclosedContracts,
    }

    const provider = window.canton
    // TODO: check success
    await provider?.request({
        method: 'prepareExecute',
        params: request,
    })
}
