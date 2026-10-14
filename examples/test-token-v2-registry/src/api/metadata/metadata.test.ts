// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRegistryInfo } from './getRegistryInfo'
import { getInstrument } from './getInstrument'
import { listInstruments } from './listInstruments'
import { instruments, supportedApis } from './common'
import { expressContext, type RequestType } from '../../__test__/mocks'
import { APIError } from '../common'

const { req, res, next } = expressContext

vi.mock('../../common/operator', () => ({
    operator: {
        party: 'admin',
    },
}))

vi.mock('../../common/state', () => ({
    RegistryState: {
        instance: {
            operator: {
                party: 'admin',
            },
        },
    },
}))

describe('Metadata', () => {
    beforeEach(() => {})

    it('should get registry info', () => {
        getRegistryInfo({} as RequestType<typeof getRegistryInfo>, res, next)

        expect(res.json).toHaveBeenCalledWith({
            adminId: 'admin',
            supportedApis,
        })
    })

    it('should list instruments', () => {
        listInstruments({} as RequestType<typeof listInstruments>, res, next)

        expect(res.json).toHaveBeenCalledWith({
            instruments,
        })
    })

    it('should return error when trying to get non-existing instrument', () => {
        req.params = {
            instrumentId: 'id',
        }
        expect(() =>
            getInstrument(
                req as unknown as RequestType<typeof getInstrument>,
                res,
                next
            )
        ).toThrow(new APIError(404, 'Instrument not found'))
    })

    it('should get existing instrument', () => {
        req.params = {
            instrumentId: instruments[0].id,
        }
        getInstrument(
            req as unknown as RequestType<typeof getInstrument>,
            res,
            next
        )

        expect(res.json).toHaveBeenCalledWith(instruments[0])
    })
})
