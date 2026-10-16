// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OffLedger } from '@canton-network/core-token-standard-v2'
import { emptyChoiceContext } from '../common'
import type { TExpressOpenApiRequestHandler } from 'openapi-ts-router/express'

/**
 * @returns Empty choice context payload for the allocation withdraw operation.
 */
export const getAllocationWithdrawContext: TExpressOpenApiRequestHandler<
    OffLedger.AllocationV2.paths['/registry/allocations/v2/{allocationId}/choice-contexts/withdraw']['post']
> = (_req, res) => {
    res.json(emptyChoiceContext)
}
