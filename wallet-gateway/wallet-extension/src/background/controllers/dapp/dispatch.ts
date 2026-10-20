// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { rpcErrors, toJsonRpcError } from '@canton-network/core-rpc-errors'
import type {
    JsonRpcRequest,
    JsonRpcResponse,
} from '@canton-network/core-types'
import { logger } from '@/shared/logger'
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

export function createDappDispatcher(deps: DappControllerDeps): DappDispatcher {
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

            const method = controller[
                request.method as keyof typeof controller
            ] as (params: unknown) => Promise<unknown>
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
