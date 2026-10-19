// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InternalLedgerNamespace } from './namespace'
import * as mock from '../../../__tests__/mocks'
import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'

const { ledgerProvider, ctx } = mock

describe('Internal Leger Namespace', () => {
    let internal: InternalLedgerNamespace

    beforeEach(() => {
        ledgerProvider.request.mockClear()

        internal = new InternalLedgerNamespace(ctx)
    })

    it('should submit a command', async () => {
        const expectedResult: LedgerCommonSchemas['SubmitAndWaitResponse'] = {
            updateId: 'updateId',
            completionOffset: 100,
        }
        ledgerProvider.request.mockResolvedValueOnce(expectedResult)

        const arg: Parameters<InternalLedgerNamespace['submit']>[0] = {
            commands: [
                {
                    CreateCommand: {
                        templateId: 'templateId',
                        createArguments: {},
                    },
                },
            ],
            actAs: ['partyId'],
        }
        const result = await internal.submit(arg)

        expect(result).toEqual(expectedResult)
        expect(ledgerProvider.request).toHaveBeenCalledWith({
            method: 'ledgerApi',
            params: expect.objectContaining({
                resource: '/v2/commands/submit-and-wait',
                requestMethod: 'post',
            }),
        })
    })

    it('should prepare a command', async () => {
        const expectedResult: LedgerCommonSchemas['JsPrepareSubmissionResponse'] =
            {
                preparedTransaction: 'preparedTransaction',
                preparedTransactionHash: 'hash',
                hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
            }
        ledgerProvider.request.mockResolvedValueOnce(expectedResult)

        const arg: Parameters<InternalLedgerNamespace['prepare']>[0] = {
            commands: [
                {
                    CreateCommand: {
                        templateId: 'templateId',
                        createArguments: {},
                    },
                },
            ],
            actAs: ['partyId'],
        }
        const result = await internal.prepare(arg)

        expect(result).toEqual(expectedResult)
        expect(ledgerProvider.request).toHaveBeenCalledWith({
            method: 'ledgerApi',
            params: expect.objectContaining({
                resource: '/v2/interactive-submission/prepare',
                requestMethod: 'post',
            }),
        })
    })

    describe('reassign', () => {
        const params: Parameters<InternalLedgerNamespace['reassign']>[0] = {
            submitter: 'party::submitter',
            contractId: 'contract-cid',
            source: 'synchronizer::source',
            target: 'synchronizer::target',
        }

        it('performs the two-phase unassign/assign reassignment', async () => {
            vi.spyOn(crypto, 'randomUUID')
                .mockReturnValueOnce(
                    'unassign-cmd-id' as ReturnType<typeof crypto.randomUUID>
                )
                .mockReturnValueOnce(
                    'assign-cmd-id' as ReturnType<typeof crypto.randomUUID>
                )

            ledgerProvider.request
                .mockResolvedValueOnce({
                    reassignment: {
                        events: [
                            {
                                JsUnassignedEvent: {
                                    value: {
                                        reassignmentId: 'reassignment-id-1',
                                    },
                                },
                            },
                        ],
                    },
                })
                .mockResolvedValueOnce({})

            await internal.reassign(params)

            expect(ledgerProvider.request).toHaveBeenCalledTimes(2)

            // Phase 1: Unassign
            expect(ledgerProvider.request).toHaveBeenNthCalledWith(1, {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/commands/submit-and-wait-for-reassignment',
                    requestMethod: 'post',
                    body: {
                        reassignmentCommands: {
                            commandId: 'unassign-cmd-id',
                            submitter: params.submitter,
                            commands: [
                                {
                                    command: {
                                        UnassignCommand: {
                                            value: {
                                                contractId: params.contractId,
                                                source: params.source,
                                                target: params.target,
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                        eventFormat: {
                            filtersByParty: { [params.submitter]: {} },
                            verbose: false,
                        },
                    },
                },
            })

            // Phase 2: Assign, using the reassignmentId returned from phase 1
            expect(ledgerProvider.request).toHaveBeenNthCalledWith(2, {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/commands/submit-and-wait-for-reassignment',
                    requestMethod: 'post',
                    body: {
                        reassignmentCommands: {
                            commandId: 'assign-cmd-id',
                            submitter: params.submitter,
                            commands: [
                                {
                                    command: {
                                        AssignCommand: {
                                            value: {
                                                reassignmentId:
                                                    'reassignment-id-1',
                                                source: params.source,
                                                target: params.target,
                                            },
                                        },
                                    },
                                },
                            ],
                        },
                    },
                },
            })

            expect(ctx.error.throw).not.toHaveBeenCalled()
        })

        it('reports a CantonError when the submitter is not a stakeholder', async () => {
            const originalError = { code: 'SUBMITTER_ALWAYS_STAKEHOLDER' }
            ledgerProvider.request.mockRejectedValueOnce(originalError)

            await expect(internal.reassign(params)).rejects.toBeDefined()

            expect(ctx.error.throw).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'CantonError',
                    originalError,
                    message: expect.stringContaining(
                        `submitter "${params.submitter}" is not a stakeholder`
                    ),
                })
            )
            expect(ledgerProvider.request).toHaveBeenCalledTimes(1)
        })

        it('reports an Unexpected error for other unassign failures', async () => {
            const originalError = new Error('network blip')
            ledgerProvider.request.mockRejectedValueOnce(originalError)

            await expect(internal.reassign(params)).rejects.toBeDefined()

            expect(ctx.error.throw).toHaveBeenCalledWith({
                message: 'Unexpected error',
                type: 'Unexpected',
                originalError,
            })
            expect(ledgerProvider.request).toHaveBeenCalledTimes(1)
        })

        it('reports an Unexpected error when no unassigned event is returned', async () => {
            ledgerProvider.request.mockResolvedValueOnce({
                reassignment: { events: [] },
            })

            await expect(internal.reassign(params)).rejects.toBeDefined()

            expect(ctx.error.throw).toHaveBeenCalledWith({
                message: `No unassigned event returned for contract ${params.contractId} reassignment`,
                type: 'Unexpected',
            })
            expect(ledgerProvider.request).toHaveBeenCalledTimes(1)
        })
    })
})
