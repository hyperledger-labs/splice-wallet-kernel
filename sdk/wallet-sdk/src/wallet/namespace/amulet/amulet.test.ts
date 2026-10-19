// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, beforeEach, expect, type Mock } from 'vitest'
import {
    AmuletNamespace,
    type AmuletNamespaceConfig,
    fetchAmulet,
} from './namespace'
import * as mock from '../../__tests__/mocks'
import { Decimal } from 'decimal.js'
import type { AssetBody } from '@canton-network/core-token-standard-service'
/* oxlint-disable typescript/no-explicit-any */

vi.mock('../utils/url.js', () => ({
    ParsedURL: class MockedParsedURL extends URL {
        constructor(
            public ctx: any,
            public input: any
        ) {
            super(input)
        }
    },
    parseAssets: vi.fn(),
}))

const { ctx, mockLogger } = mock

const registry: AssetBody = {
    id: 'Amulet',
    displayName: 'Amulet',
    symbol: 'CC',
    registryUrl: new URL('http://registry.com'),
    admin: 'adminParty:123',
    capabilities: mock.capabilities,
}
const validatorParty = 'validatorParty:123'

const mockTokenStandard = {
    get: vi.fn(),
    getInputHoldingsCids: vi.fn(),
    core: { toQualifiedMemberId: vi.fn() },
    transfer: { fetchTransferFactoryChoiceContext: vi.fn() },
    registriesToAssets: vi.fn(),
}

const mockAmuletService = {
    createTap: vi.fn(),
    selfGrantFeatureAppRight: vi.fn(),
    cancelFeaturedAppRight: vi.fn(),
    getTransferPreApprovalByParty: vi.fn(),
    getFeaturedAppsByParty: vi.fn(),
    cancelTransferPreapproval: vi.fn(),
    renewTransferPreapproval: vi.fn(),
    isDevNet: vi.fn(),
}

const config: AmuletNamespaceConfig = {
    commonCtx: {
        ...ctx,
        defaultSynchronizerId: 'mock-synchronizer-id',
        logger: mockLogger,
    } as any,
    registry,
    amuletService: mockAmuletService as unknown as any,
    tokenStandardService: mockTokenStandard as unknown as any,
    validatorParty,
}

const configNoValidator: AmuletNamespaceConfig = {
    commonCtx: {
        ...ctx,
        defaultSynchronizerId: 'mock-synchronizer-id',
        logger: mockLogger,
    } as any,
    registry,
    amuletService: mockAmuletService as unknown as any,
    tokenStandardService: mockTokenStandard as unknown as any,
}

describe('AmuletNamespace', () => {
    let amuletNamespace: AmuletNamespace
    let mockSubmit: Mock

    beforeEach(() => {
        vi.useFakeTimers()

        amuletNamespace = new AmuletNamespace(config)

        mockSubmit = vi.fn().mockResolvedValue({
            updateId: 'tx-123',
            completionOffset: '1000',
        })
        ;(amuletNamespace as any).ledger = { internal: { submit: mockSubmit } }
    })

    it('should report whether the network is DevNet', async () => {
        vi.mocked(mockAmuletService.isDevNet).mockResolvedValue(true)

        await expect(amuletNamespace.isDevNet()).resolves.toBe(true)
        expect(mockAmuletService.isDevNet).toHaveBeenCalledOnce()
    })

    describe('Tap amulet', () => {
        const testParty =
            'v1-01-alice::1220a07b16cc2186d42c97242642a9db79eda4bea472963ecd42a3e057924576f573' as any
        const tapCommand = {
            templateId: 'Splice.AmuletRules:AmuletRules',
            contractId: '001e364e529d90ba',
            choice: 'AmuletRules_DevNet_Tap',
            choiceArgument: {
                receiver: testParty,
                amount: '10000.0000000000',
                openRound: '006b5fe2c819',
            },
        }

        it('should create tap command', async () => {
            vi.mocked(mockAmuletService.createTap).mockResolvedValue([
                tapCommand,
                [],
            ])

            const result = await amuletNamespace.tap(testParty, '10000')

            expect(mockAmuletService.createTap).toHaveBeenCalledWith(
                testParty,
                new Decimal('10000').toFixed(10),
                registry.admin,
                registry.id,
                registry.registryUrl
            )
            expect(result).toStrictEqual([{ ExerciseCommand: tapCommand }, []])
        })

        it('should execute tap internal', async () => {
            vi.spyOn(amuletNamespace, 'tap').mockResolvedValue([
                { ExerciseCommand: tapCommand } as any,
                ['dc-1'] as any,
            ])

            const result = await amuletNamespace.tapInternal('10000')

            expect(amuletNamespace.tap).toHaveBeenCalledWith(
                config.validatorParty,
                '10000'
            )
            expect(mockSubmit).toHaveBeenCalledWith({
                commands: [{ ExerciseCommand: tapCommand }],
                disclosedContracts: ['dc-1'],
                synchronizerId: config.commonCtx.defaultSynchronizerId,
                actAs: [config.validatorParty],
            })
            expect(result).toStrictEqual({
                updateId: 'tx-123',
                completionOffset: '1000',
            })
        })
    })

    describe('Fetch amulet', () => {
        it('fetch amulet based on configuration', async () => {
            const result = await fetchAmulet(config)
            expect(result).toStrictEqual(config.registry)
        })
    })

    describe('Featured App Namespace', () => {
        const mockRightPayload = { contractId: 'right-id-123', payload: {} }

        describe('rights lookup retry loop', () => {
            it('should not retry if the rights are found', async () => {
                vi.mocked(
                    mockAmuletService.getFeaturedAppsByParty
                ).mockResolvedValue(mockRightPayload)

                const result = await amuletNamespace.featuredApp.rights({
                    partyId: validatorParty,
                })

                expect(result).toStrictEqual(mockRightPayload)
                expect(
                    mockAmuletService.getFeaturedAppsByParty
                ).toHaveBeenCalledTimes(1)
            })

            it('should keep retrying featured app rights based on params', async () => {
                vi.mocked(
                    mockAmuletService.getFeaturedAppsByParty
                ).mockResolvedValue(undefined)

                const trackingPromise = amuletNamespace.featuredApp.rights({
                    partyId: validatorParty,
                    maxRetries: 3,
                    delayMs: 10,
                })

                await vi.runAllTimersAsync()
                const result = await trackingPromise

                expect(result).toBeUndefined()
                expect(
                    mockAmuletService.getFeaturedAppsByParty
                ).toHaveBeenCalledTimes(3)
            })
        })

        describe('grant sequence execution', () => {
            it('skip granting featured rights if rights are already found', async () => {
                vi.mocked(
                    mockAmuletService.getFeaturedAppsByParty
                ).mockResolvedValue(mockRightPayload)

                const result = await amuletNamespace.featuredApp.grant()

                expect(result).toStrictEqual(mockRightPayload)
                expect(mockSubmit).not.toHaveBeenCalled()
            })
        })

        describe('revoke sequence execution', () => {
            it('skip revoking featured rights if none are found', async () => {
                vi.mocked(
                    mockAmuletService.getFeaturedAppsByParty
                ).mockResolvedValue(undefined)

                const result = await amuletNamespace.featuredApp.revoke()

                expect(result).toBe(true)
                expect(mockSubmit).not.toHaveBeenCalled()
            })

            it('should submit cancel and wait until rights are gone', async () => {
                const featuredRight = {
                    template_id: 'Splice.Amulet:FeaturedAppRight',
                    contract_id: 'right-cid-123',
                    payload: {},
                    created_event_blob: 'blob',
                    created_at: '2026-01-01T00:00:00Z',
                }
                vi.mocked(mockAmuletService.getFeaturedAppsByParty)
                    .mockResolvedValueOnce(featuredRight)
                    .mockResolvedValueOnce(featuredRight)
                    .mockResolvedValue(undefined)
                vi.mocked(
                    mockAmuletService.cancelFeaturedAppRight
                ).mockResolvedValue([
                    {
                        templateId: featuredRight.template_id,
                        contractId: featuredRight.contract_id,
                        choice: 'FeaturedAppRight_Cancel',
                        choiceArgument: {},
                    },
                    [],
                ])

                const trackingPromise = amuletNamespace.featuredApp.revoke({
                    maxRetries: 3,
                    delayMs: 10,
                })

                await vi.runAllTimersAsync()
                const result = await trackingPromise

                expect(result).toBe(true)
                expect(
                    mockAmuletService.cancelFeaturedAppRight
                ).toHaveBeenCalledWith(
                    featuredRight.contract_id,
                    featuredRight.template_id
                )
                expect(mockSubmit).toHaveBeenCalledWith({
                    commands: [
                        {
                            ExerciseCommand: {
                                templateId: featuredRight.template_id,
                                contractId: featuredRight.contract_id,
                                choice: 'FeaturedAppRight_Cancel',
                                choiceArgument: {},
                            },
                        },
                    ],
                    disclosedContracts: [],
                    synchronizerId: config.commonCtx.defaultSynchronizerId,
                    actAs: [config.validatorParty],
                })
            })
        })
    })
})

describe('AmuletNamespace with no validator party', () => {
    let amuletNamespace: AmuletNamespace
    let mockSubmit: Mock

    beforeEach(() => {
        vi.useFakeTimers()

        amuletNamespace = new AmuletNamespace(configNoValidator)

        mockSubmit = vi.fn().mockResolvedValue({
            updateId: 'tx-123',
            completionOffset: '1000',
        })
        ;(amuletNamespace as any).ledger = { internal: { submit: mockSubmit } }
    })

    describe('Tap amulet', () => {
        const testParty =
            'v1-01-alice::1220a07b16cc2186d42c97242642a9db79eda4bea472963ecd42a3e057924576f573' as any
        const tapCommand = {
            templateId: 'Splice.AmuletRules:AmuletRules',
            contractId: '001e364e529d90ba',
            choice: 'AmuletRules_DevNet_Tap',
            choiceArgument: {
                receiver: testParty,
                amount: '10000.0000000000',
                openRound: '006b5fe2c819',
            },
        }

        it('should execute tap internal', async () => {
            vi.spyOn(amuletNamespace, 'tap').mockResolvedValue([
                { ExerciseCommand: tapCommand } as any,
                ['dc-1'] as any,
            ])

            const result = await amuletNamespace.tapInternal('10000', {
                partyId: 'providerParty::123',
            })

            expect(amuletNamespace.tap).toHaveBeenCalledWith(
                'providerParty::123',
                '10000'
            )
            expect(mockSubmit).toHaveBeenCalledWith({
                commands: [{ ExerciseCommand: tapCommand }],
                disclosedContracts: ['dc-1'],
                synchronizerId: config.commonCtx.defaultSynchronizerId,
                actAs: ['providerParty::123'],
            })
            expect(result).toStrictEqual({
                updateId: 'tx-123',
                completionOffset: '1000',
            })
        })
    })

    describe('Featured App Namespace', () => {
        const mockRightPayload = { contractId: 'right-id-123', payload: {} }

        describe('rights lookup retry loop', () => {
            it('should not retry if the rights are found', async () => {
                vi.mocked(
                    mockAmuletService.getFeaturedAppsByParty
                ).mockResolvedValue(mockRightPayload)

                const result = await amuletNamespace.featuredApp.rights({
                    partyId: 'providerParty::123',
                })

                expect(result).toStrictEqual(mockRightPayload)
                expect(
                    mockAmuletService.getFeaturedAppsByParty
                ).toHaveBeenCalledTimes(1)
            })

            it('should keep retrying featured app rights based on params', async () => {
                vi.mocked(
                    mockAmuletService.getFeaturedAppsByParty
                ).mockResolvedValue(undefined)

                const trackingPromise = amuletNamespace.featuredApp.rights({
                    partyId: 'providerParty::123',
                    maxRetries: 3,
                    delayMs: 10,
                })

                await vi.runAllTimersAsync()
                const result = await trackingPromise

                expect(result).toBeUndefined()
                expect(
                    mockAmuletService.getFeaturedAppsByParty
                ).toHaveBeenCalledTimes(3)
            })
        })

        describe('grant sequence execution', () => {
            it('skip granting featured rights if rights are already found', async () => {
                vi.mocked(
                    mockAmuletService.getFeaturedAppsByParty
                ).mockResolvedValue(mockRightPayload)

                const result = await amuletNamespace.featuredApp.grant({
                    validatorParty: 'providerParty::123',
                })

                expect(result).toStrictEqual(mockRightPayload)
                expect(mockSubmit).not.toHaveBeenCalled()
            })
        })

        describe('revoke sequence execution', () => {
            it('skip revoking featured rights if none are found', async () => {
                vi.mocked(
                    mockAmuletService.getFeaturedAppsByParty
                ).mockResolvedValue(undefined)

                const result = await amuletNamespace.featuredApp.revoke({
                    validatorParty: 'providerParty::123',
                })

                expect(result).toBe(true)
                expect(mockSubmit).not.toHaveBeenCalled()
            })
        })
    })
})
