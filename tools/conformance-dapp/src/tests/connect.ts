// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    connectResultSchema,
    expectRejection,
    requireCondition,
    statusEventSchema,
    UNAUTHORIZED_CODES,
} from './helpers.ts'
import type { Case, RequestArgs } from './types.ts'

const category = 'Connect'
const fakePartyId = `conformance::1220${'0'.repeat(64)}`

const privilegedRequests: RequestArgs[] = [
    { method: 'listAccounts' },
    { method: 'getPrimaryAccount' },
    {
        method: 'signMessage',
        params: { message: 'CIP-103 conformance must not sign this' },
    },
    {
        method: 'prepareExecute',
        params: {
            commandId: 'conformance-unauthorized',
            commands: [
                {
                    CreateCommand: {
                        templateId:
                            '#canton-builtin-admin-workflow-ping:Canton.Internal.Ping:Ping',
                        createArguments: {
                            id: 'conformance-unauthorized',
                            initiator: fakePartyId,
                            responder: fakePartyId,
                        },
                    },
                },
            ],
        },
    },
]

export const cases: Case[] = [
    {
        id: 'connect.statusWhileDisconnected',
        name: 'Status answers while disconnected',
        category,
        run: async (runtime) => {
            await runtime.ensureDisconnected()
            const status = statusEventSchema.parse(
                await runtime.request({ method: 'status' })
            )
            requireCondition(
                !status.connection.isConnected,
                'Status reports a session while disconnected'
            )
            requireCondition(
                status.session === undefined,
                'Status exposes session details while disconnected'
            )
        },
    },
    {
        id: 'connect.unauthorized',
        name: 'Account methods are refused without a connection',
        category,
        run: async (runtime) => {
            await runtime.ensureDisconnected()
            for (const request of privilegedRequests)
                await expectRejection(
                    runtime.request(request),
                    UNAUTHORIZED_CODES
                )
            const { connection } = await runtime.request({ method: 'status' })
            requireCondition(
                !connection.isConnected,
                'A refused request established a session anyway'
            )
        },
    },
    {
        id: 'connect.approve',
        name: 'Approve connection',
        category,
        run: async (runtime) => {
            await runtime.ensureDisconnected()
            const result = connectResultSchema.parse(
                await runtime.runInteraction('approve', { method: 'connect' })
            )
            requireCondition(
                result.isConnected,
                'Approved connection is not connected'
            )
            const { connection } = await runtime.request({ method: 'status' })
            requireCondition(
                connection.isConnected,
                'Status does not reflect approved connection'
            )
        },
    },
    {
        id: 'isConnected',
        name: 'isConnected reports the session without starting a login',
        category,
        run: async (runtime) => {
            await runtime.ensureConnected()
            const result = connectResultSchema.parse(
                await runtime.request({ method: 'isConnected' })
            )
            requireCondition(
                result.isConnected,
                'isConnected disagrees with the established session'
            )
        },
    },
]
