// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from '@jest/globals'
import { CoreService } from './token-standard-service.js'
import { PrettyContract } from './txparse/types.js'
import { HoldingView } from '@canton-network/core-token-standard'

describe('getInputHoldingsCidsForAmount', () => {
    const makeHolding = (id: string, amount: string) => ({
        contractId: id,
        interfaceViewValue: {
            owner: 'dummy',
            instrumentId: {
                admin: 'partyid',
                id: 'amulet',
            },
            lock: null,
            meta: {
                values: {},
            },
            amount,
        },
        activeContract: {
            createdEvent: {
                offset: 1,
                nodeId: 1,
                contractId: id,
                templateId: 'holding tempalte id',
                createdEventBlob: 'blob',
                createdAt: 'time',
                packageName: 'name',
            },
            synchronizerId: 'blah',
            reassignmentCounter: 0,
        },
    })

    it('returns exact match', async () => {
        const holdings = [
            makeHolding('a', '200'),
            makeHolding('b', '20'),
            makeHolding('c', '30'),
        ]

        const result = await CoreService.getInputHoldingsCidsForAmount(
            20,
            holdings
        )

        expect(result).toEqual(['b'])
    })

    it('returns multiple holdings to meet target amount', async () => {
        const holdings = [
            makeHolding('b', '20'),
            makeHolding('a', '200'),
            makeHolding('c', '30'),
        ]

        const result = await CoreService.getInputHoldingsCidsForAmount(
            220,
            holdings
        )

        expect(result).toEqual(['a', 'b'])
    })

    it('returns all holdings to meet target amount even if it exceeds the target', async () => {
        const holdings = [
            makeHolding('a', '2'),
            makeHolding('b', '99'),
            makeHolding('c', '3'),
        ]

        const result = await CoreService.getInputHoldingsCidsForAmount(
            100,
            holdings
        )

        expect(result).toEqual(['b', 'a'])
    })

    it('throws an error if no unlocked holdings exist', async () => {
        const holdings: PrettyContract<HoldingView>[] = []

        await expect(
            CoreService.getInputHoldingsCidsForAmount(220, holdings)
        ).rejects.toThrow(`Sender doesn't have any unlocked holdings`)
    })

    it('throws an error if there are insufficient funds', async () => {
        const holdings = [makeHolding('a', '5'), makeHolding('b', '10')]

        await expect(
            CoreService.getInputHoldingsCidsForAmount(20, holdings)
        ).rejects.toThrow(
            `Sender doesn't have sufficient funds for this transfer. Missing amount: 5`
        )
    })

    it('throws an error if it exceeds 100 utxos', async () => {
        const holdings = Array.from({ length: 101 }, (_, i) =>
            makeHolding(`id${i}`, '1')
        )

        await expect(
            CoreService.getInputHoldingsCidsForAmount(101, holdings)
        ).rejects.toThrow(`Exceeded the maximum of 100 utxos in 1 transaction`)
    })
})
