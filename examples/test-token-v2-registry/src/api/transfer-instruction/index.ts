// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Router } from 'express'
import { getTransferFactory } from './getTransferFactory'
import { getTransferInstructionAcceptContext } from './getTransferInstructionAcceptContext'
import { getTransferInstructionRejectContext } from './getTransferInstructionRejectContext'
import { getTransferInstructionWithdrawContext } from './getTransferInstructionWithdrawContext'
import type { OffLedger } from '@canton-network/core-token-standard-v2'
import { createExpressOpenApiRouter } from 'openapi-ts-router/express'
import z, { type ZodType } from 'zod'
import { choiceContextRequestSchema } from '../common'

const pathSchema = z.object({
    transferInstructionId: z.string(),
})

const transferInstructionAPIRouter: Router = Router()

const openAPIRouter =
    createExpressOpenApiRouter<OffLedger.TransferInstructionV2.paths>(
        transferInstructionAPIRouter
    )

openAPIRouter.post('/registry/transfer-instruction/v2/transfer-factory', {
    bodySchema: z.object({
        choiceArguments: z.record(z.string(), z.unknown()),
        excludeDebugFields: z.boolean(),
    }) as unknown as ZodType<
        OffLedger.TransferInstructionV2.operations['getTransferFactory']['requestBody']['content']['application/json']
    >,
    handler: getTransferFactory,
})

openAPIRouter.post(
    '/registry/transfer-instruction/v2/{transferInstructionId}/choice-contexts/accept',
    {
        bodySchema: choiceContextRequestSchema,
        pathSchema,
        handler: getTransferInstructionAcceptContext,
    }
)

openAPIRouter.post(
    '/registry/transfer-instruction/v2/{transferInstructionId}/choice-contexts/reject',
    {
        handler: getTransferInstructionRejectContext,
        bodySchema: choiceContextRequestSchema,
        pathSchema,
    }
)

openAPIRouter.post(
    '/registry/transfer-instruction/v2/{transferInstructionId}/choice-contexts/withdraw',
    {
        handler: getTransferInstructionWithdrawContext,
        bodySchema: choiceContextRequestSchema,
        pathSchema,
    }
)

export default transferInstructionAPIRouter
