// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as dappSdk from '@canton-network/dapp-sdk'
import type { PartyId } from '@canton-network/core-types'
import type { PreparedCommand } from '@canton-network/wallet-sdk'

export const submitViaProvider = async (
    [command, disclosedContracts]: PreparedCommand,
    actAs: PartyId
): Promise<void> => {
    const provider = dappSdk.getConnectedProvider()
    if (!provider) {
        throw new Error('Dapp provider is not available')
    }

    try {
        await provider.request({
            method: 'prepareExecuteAndWait',
            params: {
                commands: [command],
                commandId: crypto.randomUUID(),
                actAs: [actAs],
                disclosedContracts,
            },
        })
    } catch (cause) {
        throw cause instanceof Error
            ? cause
            : new Error('The transaction was not completed. You can try again.')
    }
}
