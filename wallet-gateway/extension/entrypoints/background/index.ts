// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { InternalSigningDriver } from '@canton-network/core-signing-internal'
import { NotificationService } from '@canton-network/core-wallet-services/notification'
import { registerService } from '@webext-core/proxy-service'
import {
    initializeSigningStore,
    initializeWalletStore,
    loadAuthedStore,
} from './store'
import { dappController } from './dapp/controller'
import { userController } from './user/controller'
import { AuthService } from './auth-service'
import {
    registerNotificationPorts,
    withoutNotificationArgs,
} from './notifications'

export default defineBackground(() => {
    registerService(AUTH_SERVICE_KEY, AuthService)

    // One notification service is shared by the dApp & user controllers (the
    // approve popup reaches the user controller via proxy-service, so it runs
    // here too) and the content-script notification ports. Event payloads are
    // not logged, as they can contain the access token.
    const notificationService = new NotificationService(
        withoutNotificationArgs(pinoLogger)
    )
    const walletStore = initializeWalletStore()

    // Registered synchronously so a port connect that wakes the service worker
    // is not missed while the stores initialize.
    registerNotificationPorts(notificationService, async () => {
        const context = await AuthService.loadAuthContext()
        if (!context) return undefined

        const store = await loadAuthedStore(await walletStore)
        const session = await store.getSession(context.accessToken)
        if (!session) return undefined

        return { sessionId: session.id, userId: context.userId }
    })

    run(walletStore, notificationService).catch((e: unknown) => {
        logger.error('Error initializing background script {*}', { error: e })
    })
})

// defineBackground's main function cannot be async, so wrap here
async function run(
    walletStorePromise: ReturnType<typeof initializeWalletStore>,
    notificationService: NotificationService
) {
    logger.info(
        'Initializing Canton Wallet browser extension: ' + browser.runtime.id
    )

    const walletStore = await walletStorePromise
    const signingStore = initializeSigningStore()
    const signingDriver = new InternalSigningDriver(signingStore)

    const dappControllerInstance = dappController(
        () => loadAuthedStore(walletStore),
        signingDriver,
        notificationService
    )
    registerService(DAPP_RPC_KEY, dappControllerInstance)

    const userControllerInstance = userController(
        () => loadAuthedStore(walletStore),
        signingDriver,
        notificationService
    )
    registerService(USER_RPC_KEY, userControllerInstance)
}
