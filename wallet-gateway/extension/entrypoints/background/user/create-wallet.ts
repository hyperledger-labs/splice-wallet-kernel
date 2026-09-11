// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerClient } from '@canton-network/core-ledger-client'
import {
    isRpcError,
    SigningProvider,
    type SigningDriverInterface,
} from '@canton-network/core-signing-lib'
import type { AuthContext } from '@canton-network/core-wallet-auth'
import {
    PartyLevelRight,
    type Store,
    type Wallet,
} from '@canton-network/core-wallet-store'
import { fingerprintPublicKey } from '@canton-network/core-types'

function signingError(operation: string, description: string): Error {
    return new Error(`Signing driver failed to ${operation}: ${description}`)
}

// TODO: Combine with PartyAllocationService once its external-party allocation logic is extracted
export async function createExtensionWallet({
    authContext,
    ledgerClient,
    networkId,
    partyHint,
    primary,
    signingDriver,
    store,
    synchronizerId,
}: {
    authContext: AuthContext
    ledgerClient: LedgerClient
    networkId: string
    partyHint: string
    primary: boolean
    signingDriver: SigningDriverInterface
    store: Store
    synchronizerId?: string
}): Promise<Wallet> {
    const driver = signingDriver.controller(authContext.userId)
    const key = await driver.createKey({ name: partyHint })
    if (isRpcError(key)) {
        throw signingError('create key', key.error_description)
    }
    if (!key.publicKey) {
        throw new Error('Signing driver returned no public key')
    }

    const resolvedSynchronizerId =
        synchronizerId ?? (await ledgerClient.getSynchronizerId())
    const namespace = await fingerprintPublicKey(key.publicKey)
    const topology = await ledgerClient.generateTopology(
        resolvedSynchronizerId,
        key.publicKey,
        partyHint
    )
    if (!topology.multiHash) {
        throw new Error('Ledger returned no topology hash')
    }
    if (!topology.topologyTransactions?.length) {
        throw new Error('Ledger returned no topology transactions')
    }

    const signed = await driver.signTransaction({
        tx: '',
        txHash: topology.multiHash,
        keyIdentifier: { publicKey: key.publicKey },
    })
    if (isRpcError(signed)) {
        throw signingError(
            'sign topology transaction',
            signed.error_description
        )
    }
    if (!signed.signature) {
        throw new Error('Signing driver returned no signature')
    }

    const allocatedParty = await ledgerClient.allocateExternalParty(
        resolvedSynchronizerId,
        topology.topologyTransactions.map((transaction) => ({ transaction })),
        [
            {
                format: 'SIGNATURE_FORMAT_CONCAT',
                signature: signed.signature,
                signedBy: namespace,
                signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
            },
        ]
    )
    await ledgerClient.waitForPartyAndGrantUserRights(
        authContext.userId,
        allocatedParty.partyId
    )

    const wallet: Wallet = {
        partyId: allocatedParty.partyId,
        hint: partyHint,
        namespace,
        signingProviderId: SigningProvider.WALLET_KERNEL,
        networkId,
        status: 'allocated',
        primary,
        publicKey: key.publicKey,
        externalTxId: '',
        topologyTransactions: '',
        rights: [PartyLevelRight.CanActAs],
        userId: authContext.userId,
    }
    await store.addWallet(wallet)

    return wallet
}
