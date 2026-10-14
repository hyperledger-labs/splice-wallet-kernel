// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Router } from 'express'
import { getAllocationCancelContext } from './getAllocationCancelContext'
import { getAllocationWithdrawContext } from './getAllocationWithdrawContext'
import type { OffLedger } from '@canton-network/core-token-standard-v2'
import { createExpressOpenApiRouter } from 'openapi-ts-router/express'
import z from 'zod'
import { choiceContextRequestSchema } from '../common'
// import { getSettlementFactory } from './getSettlementFactory'

const pathSchema = z.object({
    allocationId: z.string(),
})

const allocationAPIRouter: Router = Router()

const openAPIRouter =
    createExpressOpenApiRouter<OffLedger.AllocationV2.paths>(
        allocationAPIRouter
    )

// openAPIRouter.post('/registry/allocation/v2/settlement-factory', {
// bodySchema: choiceContextRequestSchema,
// handler: getSettlementFactory
// })

openAPIRouter.post(
    '/registry/allocations/v2/{allocationId}/choice-contexts/cancel',
    {
        pathSchema,
        bodySchema: choiceContextRequestSchema,
        handler: getAllocationCancelContext,
    }
)

openAPIRouter.post(
    '/registry/allocations/v2/{allocationId}/choice-contexts/withdraw',
    {
        pathSchema,
        bodySchema: choiceContextRequestSchema,
        handler: getAllocationWithdrawContext,
    }
)

export default allocationAPIRouter
