// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Router } from 'express'
import { getAllocationFactory } from './getAllocationFactory'
import type { OffLedger } from '@canton-network/core-token-standard'
import { createExpressOpenApiRouter } from 'openapi-ts-router/express'
import z, { type ZodType } from 'zod'

const allocationInstructionAPIRouter: Router = Router()

const openAPIRouter =
    createExpressOpenApiRouter<OffLedger.AllocationInstructionV1.paths>(
        allocationInstructionAPIRouter
    )

openAPIRouter.post('/registry/allocation-instruction/v1/allocation-factory', {
    handler: getAllocationFactory,
    bodySchema: z.object({
        choiceArguments: z.record(z.string(), z.unknown()),
        excludeDebugFields: z.boolean(),
    }) as unknown as ZodType<
        OffLedger.AllocationInstructionV1.operations['getAllocationFactory']['requestBody']['content']['application/json']
    >,
})

export default allocationInstructionAPIRouter
