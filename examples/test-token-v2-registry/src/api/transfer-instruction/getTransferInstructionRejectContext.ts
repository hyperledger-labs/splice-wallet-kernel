// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OffLedger } from '@canton-network/core-token-standard'
import { emptyChoiceContext } from '../common'
import type { TExpressOpenApiRequestHandler } from 'openapi-ts-router/express'

/**
 * @returns Empty choice context payload for the transfer reject operation.
 */
export const getTransferInstructionRejectContext: TExpressOpenApiRequestHandler<
    OffLedger.TransferInstructionV1.paths['/registry/transfer-instruction/v1/{transferInstructionId}/choice-contexts/reject']['post']
> = (_req, res) => {
    res.json(emptyChoiceContext)
}
