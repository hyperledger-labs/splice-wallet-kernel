// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    providerErrors,
    rpcErrors,
    toJsonRpcError,
} from '@canton-network/core-rpc-errors'
import type {
    JsonRpcRequest,
    JsonRpcResponse,
} from '@canton-network/core-types'
import { logger } from '@/shared/logger'
import { openWalletUi } from '../../open-ui'
import { extensionProvider } from '../../status'
import type { Vault } from '../../vault'
import {
    dappController,
    type DappControllerDeps,
    type DappRequestContext,
} from './controller'
import type { ConnectResult, StatusEvent } from './rpc-gen/typings'

/**
 * The single entry point of the dApp API, registered as a proxy service and
 * called by the content script. It always resolves to a JSON-RPC response.
 */
export interface DappDispatcher {
    request(
        request: JsonRpcRequest,
        origin: DappRequestContext['origin']
    ): Promise<JsonRpcResponse>
}

/**
 * Answers dApp requests. While the vault isn't unlocked, known methods get
 * `lockedResult` instead of the controller's answer.
 */
export function createDappDispatcher(
    deps: DappControllerDeps,
    vault: Pick<Vault, 'ready' | 'status'>
): DappDispatcher {
    return {
        async request(request, origin) {
            const id = request.id ?? null
            const controller = dappController(deps, { origin })

            // Only the controller's own methods: never `constructor`,
            // `toString` or anything else on the prototype chain.
            if (!Object.hasOwn(controller, request.method)) {
                return {
                    jsonrpc: '2.0',
                    id,
                    error: rpcErrors
                        .methodNotFound({
                            message: `Method ${request.method} not found`,
                        })
                        .serialize(),
                }
            }

            // Wait for the restore, so a request that wakes the background
            // isn't refused while the vault is still unlocking.
            await vault.ready
            const method =
                vault.status() === 'unlocked'
                    ? (controller[
                          request.method as keyof typeof controller
                      ] as (params: unknown) => Promise<unknown>)
                    : () => lockedResult(request.method)
            try {
                return {
                    jsonrpc: '2.0',
                    id,
                    result: await method(request.params),
                }
            } catch (error) {
                logger.warn('dApp method {method} failed: {error}', {
                    method: request.method,
                    error,
                })
                return {
                    jsonrpc: '2.0',
                    id,
                    error: toJsonRpcError(error).serialize(),
                }
            }
        },
    }
}

const lockedConnection = {
    isConnected: false,
    reason: 'Locked',
    isNetworkConnected: false,
    networkReason: 'Locked',
} satisfies ConnectResult

/**
 * The answer to a dApp method while the vault isn't unlocked. Reads neither
 * the store nor the vault. `status` still answers, because dapp-sdk `open()`
 * calls it first.
 */
async function lockedResult(method: string): Promise<unknown> {
    switch (method) {
        case 'status':
            return {
                provider: extensionProvider,
                connection: lockedConnection,
            } satisfies StatusEvent
        case 'isConnected':
            return lockedConnection
        case 'connect':
            // Like a signed-out connect: report "not connected" and show the
            // wallet, here its unlock page.
            await openWalletUi('/unlock').catch((error: unknown) => {
                logger.error('Failed to open the unlock page: {error}', {
                    error,
                })
            })
            return lockedConnection
        default:
            throw providerErrors.unauthorized({ message: 'Wallet is locked' })
    }
}
