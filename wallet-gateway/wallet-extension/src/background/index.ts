// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { InternalSigningDriver } from '@canton-network/core-signing-internal'
import { NotificationService } from '@canton-network/core-wallet-services'
import { registerService } from '@webext-core/proxy-service'
import { browser } from 'wxt/browser'
import { logger } from '@/shared/logger'
import { DAPP_RPC_KEY, USER_RPC_KEY } from '@/shared/service-keys'
import { createDappDispatcher } from './controllers/dapp/dispatch'
import { requireUnlocked, userController } from './controllers/user'
import {
    currentSessionSubscriber,
    registerNotificationPorts,
    toNotificationLogger,
    withoutNotificationArgs,
} from './notifications'
import { registerFirstRunOnboarding, registerOpenUiHandler } from './open-ui'
import {
    initializeSigningStore,
    initializeWalletStore,
    loadAuthedStore,
} from './store'
import { createVault, type Vault } from './vault'
import { registerVaultService } from './vault-service'

/**
 * Runs in the service worker. Every listener is added in the first turn,
 * before any `await`, so a message or port connect that wakes the worker is
 * handled. The wallet store loads lazily: `getStore` awaits it. The vault
 * starts restoring right away; the gates await `vault.ready`.
 *
 * Tests pass a `vault` with fewer PBKDF2 iterations.
 */
export function startBackground({
    vault = createVault(),
}: { vault?: Vault } = {}): void {
    // One notification service is shared by the dApp & user controllers and
    // the content-script notification ports. Event payloads are not logged,
    // as they can contain the access token.
    const notificationService = new NotificationService(
        withoutNotificationArgs(
            toNotificationLogger(logger.getChild('notifications'))
        )
    )
    const walletStore = initializeWalletStore()
    // Settle the promise now, so a failed load isn't an unhandled rejection
    // before the first `getStore` call. Each call still sees the failure.
    walletStore.catch((error: unknown) => {
        logger.error('Error initializing the wallet store: {error}', { error })
    })
    const getStore = async () => loadAuthedStore(await walletStore)
    const signingDriver = new InternalSigningDriver(initializeSigningStore())
    const deps = { getStore, signingDriver, notificationService }

    registerVaultService(vault)
    // The dApp controller scopes the store to each request's user itself.
    registerService(
        DAPP_RPC_KEY,
        createDappDispatcher(
            { getStore: () => walletStore, notificationService },
            vault
        )
    )
    registerService(USER_RPC_KEY, requireUnlocked(vault, userController(deps)))
    registerNotificationPorts(
        notificationService,
        currentSessionSubscriber(getStore)
    )
    registerOpenUiHandler()
    registerFirstRunOnboarding()

    logger.info('Initializing Canton Wallet browser extension: {id}', {
        id: browser.runtime.id,
    })
}
