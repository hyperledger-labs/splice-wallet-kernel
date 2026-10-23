// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { expressContext } from '../../__tests__/mocks'
import { getUtilityOperator } from './getUtilityOperator'

const { res } = expressContext

vi.mock('../../common/state', () => ({
    RegistryState: {
        instance: {
            operator: {
                party: 'operator',
            },
        },
    },
}))

describe('Utilities', () => {
    beforeEach(() => {})

    it('should get the utility operator party', () => {
        getUtilityOperator({} as never, res)

        expect(res.json).toHaveBeenCalledWith({
            partyId: 'operator',
        })
    })
})
