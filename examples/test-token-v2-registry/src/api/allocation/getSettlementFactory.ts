// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OffLedger } from '@canton-network/core-token-standard-v2'
import type { TExpressOpenApiRequestHandler } from 'openapi-ts-router/express'
import { getTokenRulesFactory } from '../getTokenRulesFactory'

export const getSettlementFactory: TExpressOpenApiRequestHandler<
    OffLedger.AllocationV2.paths['/registry/allocation/v2/settlement-factory']['post']
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
