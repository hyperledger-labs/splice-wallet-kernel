// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { v4 } from 'uuid'
import { resolveTokenStandardClient, resolveAmuletService } from '../services'

export const tap = async ({
    party,
    sessionToken,
    amount,
}: {
    party: string
    sessionToken: string
    amount: number
}) => {
    // TODO: we'll need to retrieve all instrument info from the known
    // registries in order to allow the user to tap.
    const registryUrl = 'http://scan.localhost:4000'
    const tokenStandardClient = await resolveTokenStandardClient({
        registryUrl,
    })
    const amuletService = await resolveAmuletService({
        sessionToken,
    })
    const registryInfo = await tokenStandardClient.get(
        '/registry/metadata/v1/info'
    )
    const [tapCommand, disclosedContracts] = await amuletService.createTap(
        party,
        `${amount}`,
        registryInfo.adminId,
        'Amulet',
        registryUrl
    )

    const request = {
        commands: [{ ExerciseCommand: tapCommand }],
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
