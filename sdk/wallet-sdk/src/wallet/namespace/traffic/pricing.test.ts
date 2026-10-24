// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect } from 'vitest'
import { assetNeededFor, sumAmounts, wholeBytes } from './pricing'

/**
 * Throw away coverage test for the pure pricing helpers. A fuller test that
 * checks the figures against the ledger's own arithmetic comes in a later PR.
 */
describe('traffic pricing', () => {
    describe('wholeBytes', () => {
        it('floors a fractional amount', () => {
            expect(wholeBytes('1048576.9')).toBe('1048576')
        })

        it('rejects a non-decimal string', () => {
            expect(() => wholeBytes('abc')).toThrow()
        })
    })

    describe('assetNeededFor', () => {
        it('divides the traffic by the rate', () => {
            expect(assetNeededFor('1048576', '1048576')).toBe('1')
        })

        it('rejects a non-positive rate', () => {
            expect(() => assetNeededFor('10', '0')).toThrow()
        })
    })

    describe('sumAmounts', () => {
        it('adds the amounts', () => {
            expect(sumAmounts(['1', '2.5'])).toBe('3.5')
        })
    })
})
