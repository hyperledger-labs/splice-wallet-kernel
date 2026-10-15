// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OffLedger } from '@canton-network/core-token-standard'
import type { TExpressOpenApiRequestHandler } from 'openapi-ts-router/express'
import { getTokenRulesFactory } from '../getTokenRulesFactory'

/**
 * Resolves or creates an allocation factory for initiating allocation workflows.
 *
 * @returns Factory identifier with choice context on success.
 */
export const getAllocationFactory: TExpressOpenApiRequestHandler<
    OffLedger.AllocationInstructionV1.paths['/registry/allocation-instruction/v1/allocation-factory']['post']
> = async (_req, res, next) => {
    try {
        const foundFactory = await getTokenRulesFactory()
        res.json({
            factoryId: foundFactory.contractId,
            choiceContext: {
                choiceContextData: {},
                disclosedContracts: [
                    {
                        templateId: foundFactory.templateId,
                        contractId: foundFactory.contractId,
                        createdEventBlob: foundFactory.createdEventBlob ?? '',
                        synchronizerId: foundFactory.synchronizerId,
                    },
                ],
            },
        })
    } catch (e) {
        next(e)
    }
}
