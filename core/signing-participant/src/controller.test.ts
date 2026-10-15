// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { ParticipantSigningDriver } from './controller.js'
import type { AuthContext } from '@canton-network/core-wallet-auth'

const TEST_TRANSACTION = 'test-tx'
const TEST_TRANSACTION_HASH =
    '88beb0783e394f6128699bad42906374ab64197d260db05bb0cfeeb518ba3ac2'

const authContext: AuthContext = {
    userId: 'test-user-id',
    accessToken: 'test-access-token',
}

test('driver properties', async () => {
    const signingDriver = new ParticipantSigningDriver()
    expect(signingDriver.partyMode).toBe('internal')
    expect(signingDriver.signingProvider).toBe('participant')
})

test('transaction signature', async () => {
    const signingDriver = new ParticipantSigningDriver()
    const tx = await signingDriver
        .controller(authContext.userId)
        .signTransaction({
            tx: TEST_TRANSACTION,
            txHash: TEST_TRANSACTION_HASH,
            keyIdentifier: { publicKey: '' },
        })
    expect(tx).toMatchObject({ status: 'signed' })
})

test('unimplemented controller methods throw "Function not implemented."', () => {
    const controller = new ParticipantSigningDriver().controller(
        authContext.userId
    )
    const notImplementedMessage = 'Function not implemented.'

    const unimplemented: Array<{
        name: string
        invoke: () => unknown
    }> = [
        {
            name: 'getTransaction',
            invoke: () => controller.getTransaction({ txId: 'tx-1' }),
        },
        {
            name: 'getTransactions',
            invoke: () => controller.getTransactions({ txIds: ['tx-1'] }),
        },
        { name: 'getKeys', invoke: () => controller.getKeys() },
        {
            name: 'createKey',
            invoke: () => controller.createKey({ name: 'key' }),
        },
        {
            name: 'getConfiguration',
            invoke: () => controller.getConfiguration(),
        },
        {
            name: 'setConfiguration',
            invoke: () => controller.setConfiguration({}),
        },
        {
            name: 'subscribeTransactions',
            invoke: () => controller.subscribeTransactions({ txIds: [] }),
        },
    ]

    for (const { name, invoke } of unimplemented) {
        expect(invoke, name).toThrow(notImplementedMessage)
    }
})
