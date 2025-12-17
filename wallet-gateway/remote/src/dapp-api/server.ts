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
import { NotificationService } from '../notification/NotificationService.js'
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
    app.use(route, (req, res, next) => {
        const origin: string | null = req.headers.origin ?? null

        jsonRpcHandler<Methods>({
            controller: dappController(
                kernelInfo,
                dappUrl,
                userUrl,
                store.withAuthContext(req.authContext),
                notificationService,
                logger,
                origin,
                req.authContext
            ),
            logger,
        })(req, res, next)
    })

    const io = new SocketIoServer(server, {
        cors: {
            origin: serverConfig.allowedOrigins,
            methods: ['GET', 'POST'],
        },
    })

    io.on('connection', async (socket) => {
        let sessionId = undefined
        const context = await authService.verifyToken(
            socket.handshake.auth.token
        )

        if (context !== undefined) {
            const newStore = store.withAuthContext(context)
            const session = await newStore.getSession()
            sessionId = session?.id
        }

        if (context && sessionId) {
            socket.join(sessionId)
            logger.debug(
                `Socket.io connected for user: ${context.userId} with session ID: ${sessionId}`
            )

            const notifier = notificationService.getNotifier(context.userId)

            const onAccountsChanged = (...event: unknown[]) => {
                io.to(sessionId).emit('accountsChanged', ...event)
            }
            const onStatusChanged = (...event: unknown[]) => {
                io.to(sessionId).emit('statusChanged', ...event)
            }
            const onConnected = (...event: unknown[]) => {
                io.to(sessionId).emit('onConnected', ...event)
            }
            const onTxChanged = (...event: unknown[]) => {
                io.to(sessionId).emit('txChanged', ...event)
            }

            notifier.on('accountsChanged', onAccountsChanged)
            notifier.on('onConnected', onConnected)
            notifier.on('statusChanged', onStatusChanged)
            notifier.on('txChanged', onTxChanged)

            socket.on('disconnect', () => {
                logger.debug('Socket.io client disconnected')

                notifier.removeListener('accountsChanged', onAccountsChanged)
                notifier.removeListener('onConnected', onConnected)
                notifier.removeListener('statusChanged', onStatusChanged)
                notifier.removeListener('txChanged', onTxChanged)
            })
        }
    })

    return server
}
