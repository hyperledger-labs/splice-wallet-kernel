// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
// Disabled unused vars rule to allow for future implementations

import { LedgerClient } from '@canton-network/core-ledger-client'

type NetworkStatus = {
    isConnected: boolean
    reason?: string
    cantonVersion?: string
}

export async function networkStatus(
    ledgerClient: LedgerClient
): Promise<NetworkStatus> {
    try {
        const response = await ledgerClient.get('/v2/version')
        return {
            isConnected: true,
            cantonVersion: response.version,
        }
    } catch (e) {
        return {
            isConnected: false,
            reason: `Ledger unreachable: ${(e as Error).message}`,
        }
    }
}
