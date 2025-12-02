// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { pino } from 'pino'
import { v4 } from 'uuid'
import { PartyId } from '@canton-network/core-types'
import {
    createTokenStandardClient,
    createTokenStandardService,
} from './createClients.js'

export const createTransfer = async ({
    sessionToken,
    sender,
    receiver,
    amount,
    inputUtxos,
    memo,
}: {
    sessionToken: string
    sender: PartyId
    receiver: PartyId
    amount: number
    inputUtxos?: string[]
    memo?: string
}) => {
    const logger = pino({ name: 'main', level: 'debug' })
    const registryUrl = 'http://scan.localhost:4000'
    const tokenStandardClient = await createTokenStandardClient({
        logger,
        registryUrl,
    })
    const { tokenStandardService } = await createTokenStandardService({
        logger,
        sessionToken,
    })
    const registryInfo = await tokenStandardClient.get(
        '/registry/metadata/v1/info'
    )
    const [transferCommand, disclosedContracts] =
        await tokenStandardService.transfer.createTransfer(
            sender,
            receiver,
            `${amount}`,
            registryInfo.adminId,
            'Amulet',
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
    const result = await provider?.request({
        method: 'prepareExecute',
        params: request,
    })
    console.log(result)
}
