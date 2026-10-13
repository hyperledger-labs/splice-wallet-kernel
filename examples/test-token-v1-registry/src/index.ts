// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import allocationInstructionAPIRouter from './api/allocation-instruction/index.js'
import allocationAPIRouter from './api/allocation/index.js'
import { APIError } from './api/common'
import metadataAPIRouter from './api/metadata/index.js'
import transferInstructionAPIRouter from './api/transfer-instruction/index.js'
import utilitiesAPIRouter from './api/utilities/index.js'
import cors from 'cors'
import express from 'express'
import type {
    ErrorRequestHandler,
    NextFunction,
    Request,
    Response,
} from 'express'
import { TestToken } from '@canton-network/core-splice-codegen'
import defaultSdk from './common/defaultSdk.js'
import type { Server } from 'http'
import {
    type RegistryConfig,
    RegistryState,
    defaultConfig,
    DEFAULT_TEST_TOKEN_V1_REGISTRY_PORT,
} from './common/state.js'

export {
    RegistryState,
    defaultConfig,
    DEFAULT_TEST_TOKEN_V1_REGISTRY_PORT,
    type RegistryConfig,
}

let server: Server

export const startRegistry = async (config?: Partial<RegistryConfig>) => {
    const app = express()

    await RegistryState.instantiate(config ?? {})

    /**
     * @customize The registry shouldn't be responsible for vetting daml files. We're doing this for development purposes only. Feel free to remove this when constructing your own token.
     */
    if (process.env.NODE_ENV === 'development')
        await TestToken.utils.vetDar(defaultSdk)

    const errorMiddleware: ErrorRequestHandler = (
        error: Error,
        _req: Request,
        res: Response,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _next: NextFunction
    ) => {
        if (error instanceof APIError) {
            res.status(error.status).send({
                error: error.message,
            })
            return
        }
        res.status(500).send({ ...error, stack: error.stack })
    }

    server = app
        .use(cors())
        .use(express.json())
        .use(metadataAPIRouter)
        .use(transferInstructionAPIRouter)
        .use(allocationAPIRouter)
        .use(allocationInstructionAPIRouter)
        .use(utilitiesAPIRouter)
        .use(errorMiddleware)
        .listen(RegistryState.instance.port, () =>
            console.info(
                `api listening on http://localhost:${RegistryState.instance.port}`
            )
        )
}

export const stopRegistry = () => {
    if (!server) return
    RegistryState.instance.reset()
    server.close()
}

if (process.env.NODE_ENV === 'development') await startRegistry()
