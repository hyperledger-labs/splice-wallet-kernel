// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DarNamespace } from '.'
import * as mock from '../../../__tests__/mocks'
import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'

const { ledgerProvider, ctx } = mock

describe('Dar Namespace', () => {
    let dar: DarNamespace

    beforeEach(() => {
        vi.restoreAllMocks()
        ledgerProvider.request.mockClear()

        dar = new DarNamespace(ctx)
    })

    it('should successfully upload the dar file', async () => {
        ledgerProvider.request
            .mockResolvedValueOnce({
                packageIds: [],
            } satisfies LedgerCommonSchemas['ListPackagesResponse'])
            .mockResolvedValueOnce(
                {} satisfies LedgerCommonSchemas['UploadDarFileResponse']
            )

        const checkSpy = vi.spyOn(dar, 'check')
        const uploadSpy = vi.spyOn(dar, 'upload')

        const darBytes = new Uint8Array()
        await dar.upload(darBytes, 'packageId')

        expect(checkSpy).toHaveBeenCalledExactlyOnceWith('packageId')
        expect(checkSpy).toHaveResolvedWith(false)
        expect(ledgerProvider.request).toHaveBeenCalledWith({
            method: 'ledgerApi',
            params: expect.objectContaining({
                body: darBytes,
                resource: '/v2/packages',
            }),
        })
        expect(uploadSpy).toHaveResolved()
    })

    it("shouldn't upload dar if package is already uploaded", async () => {
        ledgerProvider.request.mockResolvedValueOnce({
            packageIds: ['packageId'],
        } satisfies LedgerCommonSchemas['ListPackagesResponse'])

        const checkSpy = vi.spyOn(dar, 'check')
        const uploadSpy = vi.spyOn(dar, 'upload')

        const darBytes = new Uint8Array()
        await dar.upload(darBytes, 'packageId')

        expect(checkSpy).toHaveBeenCalledExactlyOnceWith('packageId')
        expect(checkSpy).toHaveResolvedWith(true)
        expect(ledgerProvider.request).not.toHaveBeenCalledWith({
            method: 'ledgerApi',
            params: expect.objectContaining({
                body: darBytes,
                resource: '/v2/packages',
            }),
        })
        expect(uploadSpy).toHaveResolved()
    })

    it('should check for existence of dar in the ledger', async () => {
        ledgerProvider.request.mockResolvedValue({
            packageIds: ['package1', 'package2'],
        } satisfies LedgerCommonSchemas['ListPackagesResponse'])

        const result = await dar.check('package1')

        expect(result).toBe(true)
        expect(ledgerProvider.request).toHaveBeenCalledWith({
            method: 'ledgerApi',
            params: {
                resource: '/v2/packages',
                requestMethod: 'get',
            },
        })

        const wrongResult = await dar.check('non-existing-package')

        expect(wrongResult).toBe(false)
        expect(ledgerProvider.request).toHaveBeenCalledTimes(2)
    })
})
