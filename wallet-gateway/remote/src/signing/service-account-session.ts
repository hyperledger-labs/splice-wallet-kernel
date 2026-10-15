// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Logger } from 'pino'
import {
    type AuthAware,
    type AuthContext,
    AuthTokenProvider,
    resolveAuthIdentityProviderId,
} from '@canton-network/core-wallet-auth'
import type { Network, Store } from '@canton-network/core-wallet-store'
import type {
    INotificationService,
    SigningWorkerRunContextResolver,
} from '@canton-network/core-wallet-services'

export interface AutomationRunContext {
    authContext: AuthContext
    scopedStore: Store
    network: Network
}

/**
 * Resolves auth for background completion of pending external transactions.
 * Service-account networks can run without a pre-existing session by minting
 * an access token. Interactive networks still require a valid stored session.
 */
export async function resolveAutomationRunContext(
    bootstrapStore: Store & AuthAware<Store>,
    userId: string,
    networkId: string,
    logger: Logger
): Promise<AutomationRunContext | undefined> {
    const network = await bootstrapStore.getNetwork(networkId)
    if (!network) {
        logger.warn(
            { userId, networkId },
            'Skipping signing worker tick: network not found'
        )
        return undefined
    }

    if (!network.serviceAccountAuth) {
        logger.debug(
            { userId, networkId },
            'Skipping signing worker tick: network is not service-account'
        )
        return undefined
    }

    const idp = await bootstrapStore.getIdp(
        resolveAuthIdentityProviderId(
            network.serviceAccountAuth,
            network.identityProviderId
        )
    )
    const provider = AuthTokenProvider.fromGatewayConfig(
        idp,
        network.serviceAccountAuth,
        logger
    )

    const authContext = await provider.getAuthContext()
    const scopedStore = bootstrapStore.withAuthContext(authContext)

    logger.debug(
        { userId, networkId },
        'Signing worker prepared service account session'
    )

    return { authContext, scopedStore, network }
}

/**
 * Builds the {@link SigningWorkerRunContextResolver} used by the remote gateway's
 * signing worker. Only service-account networks are processed (see
 * {@link resolveAutomationRunContext}); the notifier is the one for the session
 * that belongs to the service-account access token.
 *
 * Returns `undefined` (skip the row for this tick) when no run context can be
 * resolved or no session exists for the access token.
 */
export function createServiceAccountRunContextResolver(opts: {
    store: Store & AuthAware<Store>
    notificationService: INotificationService
    logger: Logger
}): SigningWorkerRunContextResolver {
    const { store, notificationService, logger } = opts

    return async (transaction) => {
        const { userId, networkId } = transaction

        const runContext = await resolveAutomationRunContext(
            store,
            userId,
            networkId,
            logger
        )
        if (!runContext) {
            return undefined
        }

        const { authContext, scopedStore, network } = runContext
        const session = await scopedStore.getSession(authContext.accessToken)

        if (!session) {
            logger.error(
                { userId, networkId, transactionId: transaction.id },
                'Signing worker tick failed: session not found'
            )
            return undefined
        }

        return {
            authContext,
            store: scopedStore,
            network,
            notifier: notificationService.getNotifier(session.id),
        }
    }
}
