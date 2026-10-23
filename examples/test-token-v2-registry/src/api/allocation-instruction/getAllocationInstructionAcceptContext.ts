// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OffLedger } from '@canton-network/core-token-standard-v2'
import type { TExpressOpenApiRequestHandler } from 'openapi-ts-router/express'
import { emptyChoiceContext } from '../common'

export const getAllocationInstructionAcceptContext: TExpressOpenApiRequestHandler<
    OffLedger.AllocationInstructionV2.paths['/registry/allocation-instruction/v2/{allocationInstructionId}/choice-contexts/accept']['post']
> = (_req, res) => {
    res.json(emptyChoiceContext)
}
