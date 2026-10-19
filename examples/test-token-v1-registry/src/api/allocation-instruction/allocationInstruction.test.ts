// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, vi, it, expect, beforeEach } from 'vitest'
import { expressContext, mock, type RequestType } from '../../__tests__/mocks'
import { APIError } from '../common'
import { getAllocationFactory } from './getAllocationFactory'

const { res, next } = expressContext

vi.mock('../../common/sdk', async () => {
    const { mock: importedMock } = await import('../../__tests__/mocks')

    return {
        default: importedMock.sdk,
    }
})

vi.mock('../../common/state', async () => {
    const { mock: importedMock } = await import('../../__tests__/mocks')

    return importedMock.state
})

vi.mock('@canton-network/core-splice-codegen', () => ({
    TestToken: {
        DAR: {
            TestTokenV1: {
                TokenRules: {
                    templateId: 'TestTokenV1:TokenRules',
                },
            },
        },
        commands: {
            create: {
                rules: (payload: { admin: string }) => ({
                    templateId: 'TestTokenV1:TokenRules',
                    payload,
                }),
            },
        },
    },
}))

describe('Allocation Instruction', () => {
    beforeEach(() => {
        mock.state.RegistryState.instance.reset()
    })

    it('should successfully return factory contract from acs reader', async () => {
        const request = {} as RequestType<typeof getAllocationFactory>

        mock.sdk.ledger.acsReader.readJsContracts.mockResolvedValueOnce([
            {
                contractId: 'cid',
            },
        ])

        await getAllocationFactory(request, res, next)

        expect(mock.sdk.ledger.acsReader.readJsContracts).toHaveBeenCalledOnce()
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                factoryId: 'cid',
                choiceContext: expect.objectContaining({
                    choiceContextData: {},
                    disclosedContracts: expect.arrayContaining([
                        expect.objectContaining({ contractId: 'cid' }),
                    ]),
                }),
            })
        )
    })

    it('should return error in case contract creation fails', async () => {
        const request = {} as RequestType<typeof getAllocationFactory>

        mock.sdk.ledger.acsReader.readJsContracts.mockResolvedValue([])

        await getAllocationFactory(request, res, next)

        expect(mock.sdk.ledger.acsReader.readJsContracts).toHaveBeenCalledTimes(
            2
        )
        expect(mock.prepare).toHaveBeenCalledOnce()
        expect(mock.sign).toHaveBeenCalledOnce()
        expect(mock.execute).toHaveBeenCalledOnce()
        expect(next).toHaveBeenCalledWith(expect.any(APIError))
        expect(next).toHaveBeenCalledWith(
            expect.objectContaining({ status: 500 })
        )
    })

    it('should successfully create factory contract', async () => {
        const request = {} as RequestType<typeof getAllocationFactory>
        mock.sdk.ledger.acsReader.readJsContracts
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                {
                    contractId: 'cid',
                },
            ])

        await getAllocationFactory(request, res, next)

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                factoryId: 'cid',
                choiceContext: expect.objectContaining({
                    choiceContextData: {},
                    disclosedContracts: expect.arrayContaining([
                        expect.objectContaining({ contractId: 'cid' }),
                    ]),
                }),
            })
        )
    })

    it('should return factory matching allocation synchronizer id', async () => {
        const request = {} as RequestType<typeof getAllocationFactory>

        mock.state.RegistryState.instance.synchronizerId = 'allocation-sync-id'
        mock.sdk.ledger.acsReader.readJsContracts.mockResolvedValueOnce([
            {
                contractId: 'cid-1',
                synchronizerId: 'some-other-sync-id',
            },
            {
                contractId: 'cid-2',
                synchronizerId: 'allocation-sync-id',
            },
        ])

        await getAllocationFactory(request, res, next)

        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                factoryId: 'cid-2',
                choiceContext: expect.objectContaining({
                    choiceContextData: {},
                    disclosedContracts: expect.arrayContaining([
                        expect.objectContaining({ contractId: 'cid-2' }),
                    ]),
                }),
            })
        )
    })

    it('should pass allocation synchronizer id when creating factory contract', async () => {
        const request = {} as RequestType<typeof getAllocationFactory>

        mock.state.RegistryState.instance.synchronizerId = 'allocation-sync-id'
        mock.sdk.ledger.acsReader.readJsContracts
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([
                {
                    contractId: 'cid',
                },
            ])

        await getAllocationFactory(request, res, next)

        expect(mock.prepare).toHaveBeenCalledWith(
            expect.objectContaining({
                synchronizerId: 'allocation-sync-id',
            })
        )
    })
})
