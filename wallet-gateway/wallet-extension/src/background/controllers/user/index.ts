// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Vault, VaultLockedError } from '../../vault'
import type { UserControllerDeps } from './deps'
import { messages } from './messages'
import { networks } from './networks'
import buildController from './rpc-gen'
import { sessions } from './sessions'
import { transactions } from './transactions'
import { unsupported } from './unsupported'
import { wallets } from './wallets'

export type { UserControllerDeps } from './deps'

/**
 * The user API, called by the extension pages. Each area module returns its
 * part of `Methods`; `buildController` fails to typecheck if one is missing.
 */
export const userController = (deps: UserControllerDeps) =>
    buildController({
        ...sessions(deps),
        ...networks(deps),
        ...wallets(deps),
        ...transactions(deps),
        ...messages(),
        ...unsupported(),
    })

/**
 * Puts a controller behind the vault lock: each of its methods waits for the
 * vault's restore, then rejects with `VaultLockedError` unless the vault is
 * unlocked. proxy-service has no sender check, so the user API needs this on
 * top of the pages' guard.
 */
export function requireUnlocked<
    T extends Record<string, (...args: never[]) => Promise<unknown>>,
>(vault: Pick<Vault, 'ready' | 'status'>, controller: T): T {
    return Object.fromEntries(
        Object.entries(controller).map(([name, method]) => [
            name,
            async (...args: Parameters<typeof method>) => {
                await vault.ready
                if (vault.status() !== 'unlocked') throw new VaultLockedError()
                return method(...args)
            },
        ])
    ) as T
}
