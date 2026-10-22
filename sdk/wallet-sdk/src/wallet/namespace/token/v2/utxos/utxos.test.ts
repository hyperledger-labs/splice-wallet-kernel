// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it, vi, beforeEach, expect } from 'vitest'
import * as mock from '../../../../__tests__/mocks'
import type { TokenNamespaceConfig } from '../../index'
import { TokenV2Namespace } from '../namespace'
import { ParsedURL } from '../../../utils/url'
import type { UtxoNamespace } from './namespace'
import { HOLDING_INTERFACE_ID_V2 } from '@canton-network/core-token-standard-v2'

/* oxlint-disable typescript/no-explicit-any */
const { ctx, mockLogger } = mock

const mockTokenStandard = {
    listContractsByInterface: vi.fn(),
    registriesToAssets: vi.fn(),

    isHoldingLocked: vi.fn(),
}

const config: TokenNamespaceConfig = {
    commonCtx: {
        ...ctx,
        defaultSynchronizerId: 'mock-synchronizer-id',
        logger: mockLogger,
    } as any,
    registryUrls: [new ParsedURL(ctx, 'http://registry.com')],
    tokenStandardService: mockTokenStandard as unknown as any,
    validatorParty: 'validatorParty::123',
}

describe('utxos namespace', () => {
    let utxos: UtxoNamespace

    beforeEach(() => {
        vi.resetAllMocks()
        utxos = new TokenV2Namespace(config).utxos
    })
    it('should list utxos for a current party', async () => {
        const spy = mockTokenStandard.listContractsByInterface
        spy.mockResolvedValue([
            {
                contractId: 'cid',
                interfaceViewValue: {
                    lock: null,
                },
                activeContract: 'contract',
                fetchedAtOffset: 10,
            },
        ])

        await utxos.list({
            partyId: 'alice::abc',
        })
        expect(spy).toHaveBeenCalledExactlyOnceWith(
            HOLDING_INTERFACE_ID_V2,
            'alice::abc',
            undefined,
            undefined,
            undefined
        )
    })
})
