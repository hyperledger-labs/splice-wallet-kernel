// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { rpcErrors, toJsonRpcError } from '@canton-network/core-rpc-errors'
import type {
    JsonRpcRequest,
    JsonRpcResponse,
} from '@canton-network/core-types'
import { logger } from '@/shared/logger'
import { authContext } from '../../auth-context'
import type { Vault } from '../../vault'
import {
    dappController,
    type DappControllerDeps,
    type DappRequestContext,
} from './controller'

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
 * Answers dApp requests: resolves who each one acts for, like the remote's
 * auth middleware, then hands it to the controller.
 */
export function createDappDispatcher(
    deps: DappControllerDeps,
    vault: Pick<Vault, 'ready' | 'status'>
): DappDispatcher {
    /** While the vault isn't unlocked, there's no signed-in user. */
    async function requestContext(
        origin: DappRequestContext['origin']
    ): Promise<DappRequestContext> {
        // Wait for the restore, so a request that wakes the background
        // isn't refused while the vault is still unlocking.
        await vault.ready
        const locked = vault.status() !== 'unlocked'
        return {
            origin,
            locked,
            auth: locked ? undefined : await authContext.load(),
        }
    }

    return {
        async request(request, origin) {
            const id = request.id ?? null
            try {
                const controller = dappController(
                    deps,
                    await requestContext(origin)
                )

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

                const method = controller[
                    request.method as keyof typeof controller
                ] as (params: unknown) => Promise<unknown>
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
