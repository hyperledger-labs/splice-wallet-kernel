// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import { AuthAware } from '@canton-network/core-wallet-auth'
import { Store } from '@canton-network/core-wallet-store'
import express from 'express'
import { Logger } from 'pino'
import { KernelInfo } from '../config/Config.js'
import { jsonRpcHandler } from '../middleware/jsonRpcHandler.js'
import { NotificationService } from '../notification/NotificationService.js'
import { userController } from './controller.js'
import { Methods } from './rpc-gen/index.js'

export const user = (
    route: string,
    app: express.Express,
    logger: Logger,
    kernelInfo: KernelInfo,
    notificationService: NotificationService,
    drivers: Partial<Record<SigningProvider, SigningDriverInterface>>,
    store: Store & AuthAware<Store>
) => {
    app.use(route, (req, res, next) =>
        jsonRpcHandler<Methods>({
            controller: userController(
                kernelInfo,
                store.withAuthContext(req.authContext),
                notificationService,
                req.authContext,
                drivers,
                logger
            ),
            logger,
        })(req, res, next)
    )

    return app
}
