// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TestTokenV2 } from '@canton-network/core-splice-codegen'
import type { OffLedger } from '@canton-network/core-token-standard'

export const supportedApis: OffLedger.MetadataV1.components['schemas']['SupportedApis'] =
    {
        'splice-api-token-metadata-v1': 1,
        'splice-api-token-transfer-instruction-v2': 1,
        'splice-api-token-allocation-v2': 1,
        'splice-api-token-allocation-instruction-v2': 1,
    }

/**
 * @customize link data with a database
 */
export const instruments: OffLedger.MetadataV1.components['schemas']['Instrument'][] =
    [
        {
            id: TestTokenV2.DAR.TestTokenID,
            name: 'TestTokenV',
            symbol: 'tt',
            totalSupply: '1_000_000_000',
            totalSupplyAsOf: '2026-07-13T09:49:23.104Z',
            decimals: 2,
            supportedApis,
            paused: false,
            showAccountInputFields: false,
        },
    ]
