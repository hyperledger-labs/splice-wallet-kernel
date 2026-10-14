// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OffLedger } from '@canton-network/core-token-standard-v2'
import type { TExpressOpenApiRequestHandler } from 'openapi-ts-router/express'

/**
 * @returns Empty choice context payload for the allocation cancel operation.
 */
export const getSettlementFactory: TExpressOpenApiRequestHandler<
    OffLedger.AllocationV2.paths['/registry/allocation/v2/settlement-factory']['post']
> = (_req, res) => {
    // @ts-expect-error this is a dummy to be changed later
    res.json({})
}
