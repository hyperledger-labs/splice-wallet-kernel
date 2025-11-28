// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import express from 'express'
import cors from 'cors'
import { dappController } from './controller.js'
import { Logger } from 'pino'
import { jsonRpcHandler } from '../middleware/jsonRpcHandler.js'
import { Methods } from './rpc-gen/index.js'
import { Store } from '@canton-network/core-wallet-store'
import { AuthService, AuthAware } from '@canton-network/core-wallet-auth'
import { Server } from 'http'
import { Server as SocketIoServer } from 'socket.io'
import {
    NotificationService,
    Notifier,
} from '../notification/NotificationService.js'
import { KernelInfo, ServerConfig } from '../config/Config.js'

export const dapp = (
    route: string,
    app: express.Express,
    logger: Logger,
    server: Server,
    kernelInfo: KernelInfo,
    dappUrl: string,
    userUrl: string,
    serverConfig: ServerConfig,
    notificationService: NotificationService,
    authService: AuthService,
    store: Store & AuthAware<Store>
) => {
    app.use(
        cors({
            origin: serverConfig.allowedOrigins,
        })
    )
    app.use(route, (req, res, next) =>
        jsonRpcHandler<Methods>({
            controller: dappController(
                kernelInfo,
                dappUrl,
                userUrl,
                store.withAuthContext(req.authContext),
                notificationService,
                logger,
                req.authContext
            ),
            logger,
        })(req, res, next)
    )

    const io = new SocketIoServer(server, {
        cors: {
            origin: serverConfig.allowedOrigins,
            methods: ['GET', 'POST'],
        },
    })

    io.on('connection', (socket) => {
        logger.info('Socket.io client connected')

        let notifier: Notifier | undefined = undefined

        const onAccountsChanged = (...event: unknown[]) => {
            io.emit('accountsChanged', ...event)
        }
        const onStatusChanged = (...event: unknown[]) => {
            io.emit('statusChanged', ...event)
        }
        const onConnected = (...event: unknown[]) => {
            io.emit('onConnected', ...event)
        }
        const onTxChanged = (...event: unknown[]) => {
            io.emit('txChanged', ...event)
        }

        authService
            .verifyToken(socket.handshake.auth.token)
            .then((authContext) => {
                const userId = authContext?.userId

                if (!userId) {
                    return
                }

                notifier = notificationService.getNotifier(userId)

                notifier.on('accountsChanged', onAccountsChanged)
                notifier.on('onConnected', onConnected)
                notifier.on('statusChanged', onStatusChanged)
                notifier.on('txChanged', onTxChanged)
            })

        socket.on('disconnect', () => {
            logger.info('Socket.io client disconnected')

            if (notifier) {
                notifier.removeListener('accountsChanged', onAccountsChanged)
                notifier.removeListener('onConnected', onConnected)
                notifier.removeListener('statusChanged', onStatusChanged)
                notifier.removeListener('txChanged', onTxChanged)
            }
        })
    })

    return server
}
