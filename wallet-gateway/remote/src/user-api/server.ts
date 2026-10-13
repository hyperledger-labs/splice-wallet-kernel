// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'
import type { AuthAware } from '@canton-network/core-wallet-auth'
import type { Store } from '@canton-network/core-wallet-store'
import type express from 'express'
import type { Logger } from 'pino'
import type { KernelInfo } from '../config/Config.js'
import { jsonRpcHandler } from '../middleware/jsonRpcHandler.js'
import { userController } from './controller.js'
import type { Methods } from './rpc-gen/index.js'
import type {
    HASHING_SCHEME_VERSION,
    NotificationService,
} from '@canton-network/core-wallet-services'
import { paramSchemas } from './rpc-gen/schemas.js'

export const user = (
    route: string,
    app: express.Express,
    logger: Logger,
    kernelInfo: KernelInfo,
    userUrl: string,
    notificationService: NotificationService,
    drivers: Partial<Record<SigningProvider, SigningDriverInterface>>,
    store: Store & AuthAware<Store>,
    hashingSchemeVersion: HASHING_SCHEME_VERSION,
    adminUserId?: string
) => {
    app.use(route, (req, res, next) =>
        jsonRpcHandler<Methods>({
            controller: userController(
                kernelInfo,
                userUrl,
                store.withAuthContext(req.authContext),
                notificationService,
                req.authContext,
                drivers,
                logger,
                hashingSchemeVersion,
                adminUserId
            ),
            logger,
            paramSchemas,
        })(req, res, next)
    )

    return app
}
