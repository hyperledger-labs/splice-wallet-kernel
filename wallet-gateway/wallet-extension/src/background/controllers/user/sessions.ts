// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LOGOUT_EVENT } from '@canton-network/core-wallet-services'
import { logger } from '@/shared/logger'
import { authContext } from '../../auth-context'
import { notifySessionTerminated } from '../../status'
import type { UserControllerDeps } from './deps'
import { toNetworkDto } from './networks'
import type { Methods } from './rpc-gen'
import type {
    AddSessionParams,
    Status,
    UserLevelRight,
} from './rpc-gen/typings'

export const sessions = ({
    getStore,
    notificationService,
}: UserControllerDeps): Pick<
    Methods,
    'addSession' | 'removeSession' | 'listSessions'
> => ({
    addSession: async (params: AddSessionParams) => {
        const context = await authContext.load()
        if (!context) {
            throw new Error(
                'No auth context found. User must be authenticated to add a session.'
            )
        }
        const store = await getStore()
        const newSessionId = crypto.randomUUID()

        logger.info(
            `Adding session with ID ${newSessionId} for network ${params.networkId}`
        )

        const network = await store.getNetwork(params.networkId)
        const idp = await store.getIdp(network.identityProviderId)
        // assertTokenClaimsMatchNetwork(accessToken, network, idp)

        // setSession replaces the origin's authenticated sessions; look
        // them up first so their notification ports can be closed.
        const replacedSessions = (await store.listSessions()).filter(
            (session) => session.origin === params.origin && session.accessToken
        )

        await store.setSession({
            id: newSessionId,
            origin: params.origin,
            network: params.networkId,
            accessToken: context.accessToken,
        })

        // The content script reopens its port, bound to the new session,
        // on the next connected `connect`/`status` response.
        for (const session of replacedSessions) {
            notificationService.getNotifier(session.id).emit(LOGOUT_EVENT)
        }

        // TODO: fill in
        const status = {} as Status
        const rights = [] as UserLevelRight[]

        return {
            id: newSessionId,
            network: toNetworkDto(network),
            idp,
            accessToken: context.accessToken,
            status,
            rights,
        }
    },
    removeSession: async () => {
        const context = await authContext.load()
        if (!context) {
            return null
        }

        try {
            const store = await getStore()
            const session = await store.getSession(context.accessToken)
            await store.removeSession(context.accessToken)

            if (session) {
                notifySessionTerminated(
                    notificationService,
                    session.id,
                    'removed session'
                )
            }
        } finally {
            await authContext.clear()
        }

        return null
    },
    listSessions: async () => {
        const context = await authContext.load()
        if (!context) {
            throw new Error(
                'No auth context found. User must be authenticated to list sessions.'
            )
        }
        const store = await getStore()
        const sessions = await store.listSessions()

        return {
            sessions: await Promise.all(
                sessions.map(async (session) => {
                    const network = await store.getNetwork(session.network)
                    const idp = await store.getIdp(network.identityProviderId)

                    return {
                        id: session.id,
                        origin: session.origin,
                        network: toNetworkDto(network),
                        idp,
                        accessToken: context.accessToken,
                        status: {} as Status,
                        rights: [] as UserLevelRight[],
                    }
                })
            ),
        }
    },
})
