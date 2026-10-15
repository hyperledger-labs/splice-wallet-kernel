// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyLevelRight, type Wallet } from '@canton-network/core-wallet-store'
import type { WalletPickerEntry } from '@canton-network/core-types'
import type {
    Idp,
    Network,
    PublicNetwork,
} from '@canton-network/core-wallet-user-rpc-client'

export function makeWallet(overrides: Partial<Wallet> = {}): Wallet {
    return {
        primary: false,
        status: 'allocated',
        partyId: 'party::ns',
        hint: 'alice',
        publicKey: 'pk',
        namespace: 'ns',
        networkId: 'net-1',
        signingProviderId: 'local',
        rights: [],
        userId: 'user-id',
        ...overrides,
    }
}

export function makePublicNetwork(
    overrides: Partial<PublicNetwork> = {}
): PublicNetwork {
    return {
        id: 'net-1',
        name: 'Test Network',
        description: 'Test network description',
        authMethod: 'authorization_code',
        synchronizerId: 'sync::id',
        identityProviderId: 'idp-1',
        ledgerApi: 'https://ledger.example',
        clientId: 'client-1',
        ...overrides,
    }
}

export function makeNetwork(overrides: Partial<Network> = {}): Network {
    return {
        id: 'net-1',
        name: 'Test Network',
        description: 'Test network description',
        identityProviderId: 'idp-1',
        ledgerApi: 'http://localhost:6865',
        auth: {
            method: 'authorization_code',
            audience: 'audience',
            scope: 'scope',
            clientId: 'client-id',
        },
        ...overrides,
    } as Network
}

export function makeWalletPickerEntry(
    overrides: Partial<WalletPickerEntry> = {}
): WalletPickerEntry {
    return {
        providerId: 'provider-id',
        name: 'Test Wallet',
        type: 'remote',
        ...overrides,
    }
}

export function makeIdp(
    overrides: Partial<{
        id: string
        type: Idp['type']
        issuer: string
        configUrl: string
    }> = {}
): Idp {
    const idp = {
        id: 'idp-1',
        type: 'oauth' as Idp['type'],
        issuer: 'https://issuer.example',
        configUrl: 'https://issuer.example/.well-known',
        ...overrides,
    }

    switch (idp.type) {
        case 'oauth':
            return idp
        case 'self_signed':
            return {
                id: idp.id,
                type: idp.type,
                issuer: idp.issuer,
            }
        case 'self_issued':
            return {
                id: idp.id,
                type: idp.type,
            }
    }
}

export { PartyLevelRight }
