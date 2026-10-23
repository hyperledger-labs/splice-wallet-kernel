// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { expressContext, type RequestType } from '../../__tests__/mocks'
import { emptyChoiceContext } from '../common'
import { getAllocationCancelContext } from './getAllocationCancelContext'
import { getAllocationWithdrawContext } from './getAllocationWithdrawContext'
import { getSettlementFactory } from './getSettlementFactory'

const { res, next } = expressContext

const mockedFactory = vi.hoisted(() => ({
    contractId: 'contractId',
    templateId: 'templateId',
    createdEventBlob: 'blob',
    synchronizerId: 'synchronizerId',
}))

vi.mock('../getTokenRulesFactory.ts', () => {
    return {
        getTokenRulesFactory: async () => mockedFactory,
    }
})

describe('Allocation', () => {
    beforeEach(() => {})

    it('should return correct allocation withdraw context', () => {
        getAllocationWithdrawContext(
            {} as RequestType<typeof getAllocationWithdrawContext>,
            res,
            next
        )

        expect(res.json).toHaveBeenCalledWith(emptyChoiceContext)
    })

    it('should return correct allocation cancel context', () => {
        getAllocationCancelContext(
            {} as RequestType<typeof getAllocationCancelContext>,
            res,
            next
        )

        expect(res.json).toHaveBeenCalledWith(emptyChoiceContext)
    })

    it('should return settlement factory contract', async () => {
        const getTokenRulesFactorySpy = vi.spyOn(
            await import('../getTokenRulesFactory.ts'),
            'getTokenRulesFactory'
        )
        await getSettlementFactory(
            {} as RequestType<typeof getSettlementFactory>,
            res,
            next
        )

        expect(getTokenRulesFactorySpy).toHaveBeenCalledOnce()

        expect(res.json).toHaveBeenCalledExactlyOnceWith({
            factoryId: mockedFactory.contractId,
            choiceContext: {
                choiceContextData: {},
                disclosedContracts: [{ ...mockedFactory }],
            },
        })
    })
})
