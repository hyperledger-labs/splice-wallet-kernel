// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    expectRejection,
    INVALID_PARAMS_CODES,
    REJECTED_TRANSACTION_CODES,
    requireCondition,
    txChangedEventSchema,
} from './helpers.ts'
import type { Case, RequestArgs, TestRuntime } from './types.ts'
import type { PrepareExecuteParams } from '@canton-network/dapp-sdk'
import type { z } from 'zod'

type TxEvent = z.infer<typeof txChangedEventSchema>
type SignedTxEvent = Extract<TxEvent, { status: 'signed' }>

const category = 'Prepare & execute'

export const cases: Case[] = [
    {
        id: 'prepareExecute.missingParams',
        name: 'Transaction without parameters returns InvalidParams',
        category,
        run: async (runtime) => {
            await runtime.ensureConnected()
            await expectRejection(
                runtime.request({
                    method: 'prepareExecute',
                } as unknown as RequestArgs),
                INVALID_PARAMS_CODES
            )
        },
    },
    {
        id: 'prepareExecute.invalidParams',
        name: 'Transaction with non-array commands returns InvalidParams',
        category,
        run: async (runtime) => {
            await runtime.ensureConnected()
            await expectRejection(
                runtime.request({
                    method: 'prepareExecute',
                    params: {
                        commandId: 'conformance-invalid-params',
                        commands: 'invalid',
                    } as unknown as PrepareExecuteParams,
                }),
                INVALID_PARAMS_CODES
            )
        },
    },
    {
        id: 'prepareExecute.reject',
        name: 'Reject Ping transaction',
        category,
        run: async (runtime) => {
            await runtime.ensureConnected()
            const account = await runtime.request({
                method: 'getPrimaryAccount',
            })
            const params = pingParams(account.partyId)
            const watching = watchTransaction(runtime, params.commandId)
            // Sync wallets reject the request; async wallets resolve it and report the rejection via txChanged only.
            await runtime
                .runInteraction('reject', { method: 'prepareExecute', params })
                .catch((error: unknown) =>
                    expectRejection(
                        Promise.reject(error),
                        REJECTED_TRANSACTION_CODES
                    )
                )
            const events = await watching
            const statuses = events.map((event) => event.status)
            requireCondition(
                !statuses.includes('executed'),
                'A rejected transaction was executed anyway'
            )
            requireCondition(
                !statuses.includes('signed'),
                'A rejected transaction was signed anyway'
            )
        },
    },
    {
        id: 'prepareExecute.approve',
        name: 'Approve Ping transaction',
        category,
        run: async (runtime) => {
            await runtime.ensureConnected()
            const account = await runtime.request({
                method: 'getPrimaryAccount',
            })
            const params = pingParams(account.partyId)
            const watching = watchTransaction(runtime, params.commandId)
            const result = await runtime.runInteraction('approve', {
                method: 'prepareExecute',
                params,
            })
            requireCondition(result === null, 'prepareExecute must return null')
            const events = await watching
            const statuses = events.map((event) => event.status)
            const status = statuses.at(-1)
            requireCondition(
                !statuses.includes('failed'),
                'An approved transaction was rejected anyway'
            )
            requireCondition(
                status === 'executed',
                `Expected an executed transaction, received ${status}`
            )
            const signed = events.find(
                (event): event is SignedTxEvent => event.status === 'signed'
            )
            requireCondition(
                signed,
                'No signed txChanged event was emitted before execution'
            )
            requireCondition(
                signed.payload.party === account.partyId,
                `Signed txChanged event names party ${signed.payload.party}, expected ${account.partyId}`
            )
        },
    },
]

function pingParams(partyId: string) {
    const commandId = crypto.randomUUID()
    return {
        commandId,
        commands: [
            {
                CreateCommand: {
                    templateId:
                        '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
                    createArguments: {
                        id: commandId,
                        initiator: partyId,
                        responder: partyId,
                    },
                },
            },
        ],
    } satisfies PrepareExecuteParams
}

function watchTransaction(runtime: TestRuntime, commandId: string) {
    const events: TxEvent[] = []
    return new Promise<typeof events>((resolve, reject) => {
        runtime.onEvent('txChanged', (value) => {
            const event = txChangedEventSchema.safeParse(value)
            if (event.success && event.data.commandId !== commandId) return
            runtime.observe({
                method: 'prepareExecute',
                event: 'txChanged',
                result: value,
            })
            if (!event.success) return reject(event.error)
            events.push(event.data)
            if (
                event.data.status === 'executed' ||
                event.data.status === 'failed'
            )
                resolve(events)
        })
    })
}
