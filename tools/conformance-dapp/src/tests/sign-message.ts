// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    expectRejection,
    INVALID_PARAMS_CODES,
    REJECTED_TRANSACTION_CODES,
    requireCondition,
    signMessageResultSchema,
} from './helpers.ts'
import { verifyMessageSignature } from '../validation.ts'
import type { Case, RequestArgs, TestRuntime } from './types.ts'
import type { SignMessageParams } from '@canton-network/dapp-sdk'

const category = 'Sign message'

export const cases: Case[] = [
    {
        id: 'signMessage.missingParams',
        name: 'Signing without parameters returns InvalidParams',
        category,
        run: async (runtime) => {
            await runtime.ensureConnected()
            await expectRejection(
                runtime.request({
                    method: 'signMessage',
                } as unknown as RequestArgs),
                INVALID_PARAMS_CODES
            )
        },
    },
    {
        id: 'signMessage.invalidParams',
        name: 'Signing a non-string message returns InvalidParams',
        category,
        run: async (runtime) => {
            await runtime.ensureConnected()
            await expectRejection(
                runtime.request({
                    method: 'signMessage',
                    params: { message: 42 } as unknown as SignMessageParams,
                } as unknown as RequestArgs),
                INVALID_PARAMS_CODES
            )
        },
    },
    {
        id: 'signMessage.reject',
        name: 'Reject message signing',
        category,
        run: async (runtime) => {
            await runtime.ensureConnected()
            observeMessageSignatures(runtime)
            await expectRejection(
                runtime.runInteraction('reject', {
                    method: 'signMessage',
                    params: { message: testMessage() },
                }),
                REJECTED_TRANSACTION_CODES
            )
        },
    },
    {
        id: 'signMessage.approve',
        name: 'Approve message signing',
        category,
        run: async (runtime) => {
            await runtime.ensureConnected()
            const message = testMessage()
            observeMessageSignatures(runtime)
            const result = signMessageResultSchema.parse(
                await runtime.runInteraction('approve', {
                    method: 'signMessage',
                    params: { message },
                })
            )

            const account = await runtime.request({
                method: 'getPrimaryAccount',
            })
            requireCondition(
                await verifyMessageSignature(
                    message,
                    result.signature,
                    account.publicKey
                ),
                'The returned signature does not verify against the account public key'
            )
        },
    },
]

function testMessage() {
    return `CIP-103 conformance ${crypto.randomUUID()}`
}

// Only async wallets emit messageSignature events, so they are recorded but not asserted.
function observeMessageSignatures(runtime: TestRuntime) {
    runtime.onEvent('messageSignature', (value) =>
        runtime.observe({
            method: 'signMessage',
            event: 'messageSignature',
            result: value,
        })
    )
}
