// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { getRegistryInfo } from './getRegistryInfo'
import { listInstruments } from './listInstruments'
import { getInstrument } from './getInstrument'
import type { OffLedger } from '@canton-network/core-token-standard'
import { createExpressOpenApiRouter } from 'openapi-ts-router/express'
import { Router } from 'express'
import z from 'zod'

const metadataAPIRouter: Router = Router()

const openAPIRouter =
    createExpressOpenApiRouter<OffLedger.MetadataV1.paths>(metadataAPIRouter)

openAPIRouter.get('/registry/metadata/v1/info', {
    handler: getRegistryInfo,
})

openAPIRouter.get('/registry/metadata/v1/instruments', {
    handler: listInstruments,
})

openAPIRouter.get('/registry/metadata/v1/instruments/{instrumentId}', {
    pathSchema: z.object({
        instrumentId: z.string(),
    }),
    handler: getInstrument,
})

export default metadataAPIRouter
