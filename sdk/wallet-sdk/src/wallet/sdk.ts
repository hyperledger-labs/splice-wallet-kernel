// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { SDKLogger } from './logger/logger.js'
import { SDKErrorHandler } from './error/handler.js'
import {
    type AbstractLedgerProvider,
    LedgerProvider,
    type Ops,
} from '@canton-network/core-provider-ledger'
import {
    EXTENDED_SDK_OPTION_KEYS,
    type ExtendedSDKOptions,
    type BasicSDKOptions,
    type OfflineSDKInterface,
    type GetExtendedKeys,
    type SDKInterface,
} from './init/types/sdk.js'
import {
    AuthTokenProvider,
    type TokenProviderConfig,
} from '@canton-network/core-wallet-auth'
import {
    ExtendedInitializedSDK,
    OfflineInitializedSDK,
} from './init/initializedSDK.js'
import type {
    LedgerTypes as LedgerRpc,
    LedgerCommonSchemas,
} from '@canton-network/core-ledger-client-types'
import type { AllowedLogAdapters } from './logger/types.js'
import type { DappLedgerRpc } from '@canton-network/core-provider-dapp'
import type { SDKContext } from './index.js'
import { SynchronizerResolver } from './init/synchronizer.js'
import { ValidatorInternalClient } from '@canton-network/core-splice-client'
export {
    resolveCapabilities,
    type AssetBody,
} from '@canton-network/core-token-standard-service'
export { findAsset } from './namespace/asset/index.js'
export type * from './namespace/asset/index.js'
export type * from './namespace/token/index.js'
export type * from './namespace/amulet/index.js'
export { type TokenProviderConfig } from '@canton-network/core-wallet-auth'
export { LedgerProvider } from '@canton-network/core-provider-ledger'
export {
    type Event,
    type CompletionEvent,
    type UpdateEvent,
} from './namespace/events/index.js'
export type * from './namespace/transactions/types.js'
export {
    signTransactionHash,
    getPublicKeyFromPrivate,
} from '@canton-network/core-signing-lib'
export type { LedgerCommonSchemas }

export * from './init/index.js'
export type {
    PrepareOptions,
    ExecuteOptions,
} from './namespace/ledger/index.js'
export type * from './namespace/traffic/types.js'
export * from './namespace/transactions/prepared.js'
export * from './namespace/transactions/signed.js'
export { ScanProxyClient } from '@canton-network/core-splice-client'

export class SDK {
    static async create<
        L extends LedgerRpc = DappLedgerRpc,
        Options extends BasicSDKOptions<L> & Partial<ExtendedSDKOptions> =
            BasicSDKOptions<L> & Partial<ExtendedSDKOptions>,
    >(options: Options): Promise<SDKInterface<GetExtendedKeys<Options>>> {
        const logger = new SDKLogger(options.logAdapter ?? 'pino')
        const error = new SDKErrorHandler(logger)
        let authTokenProvider: AuthTokenProvider | undefined

        const ledgerProvider =
            'ledgerProvider' in options
                ? (options.ledgerProvider as AbstractLedgerProvider)
                : (() => {
                      authTokenProvider = new AuthTokenProvider(options.auth)

                      return new LedgerProvider({
                          baseUrl: options.ledgerClientUrl,
                          accessTokenProvider: authTokenProvider,
                      })
                  })()

        const authenticatedUser = await ledgerProvider
            .request<Ops.GetV2AuthenticatedUser>({
                method: 'ledgerApi',
                params: {
                    requestMethod: 'get',
                    resource: '/v2/authenticated-user',
                    query: {},
                },
            })
            .catch((err) => {
                if (
                    //this is only the cause if authentication is completely disabled on the ledger.
                    err?.cause &&
                    typeof err.cause === 'string' &&
                    err.cause.includes(
                        'The submitted request is missing a user-id'
                    )
                ) {
                    return undefined
                } else throw err
            })

        const userIdFromAuthContext =
            !authenticatedUser?.user?.id && authTokenProvider
                ? await authTokenProvider
                      .getAuthContext()
                      .then((authContext) => authContext.userId)
                      .catch(() => undefined)
                : undefined

        const userId = authenticatedUser?.user?.id ?? userIdFromAuthContext
        if (!userId) {
            error.throw({
                message: 'Not an authenticated user',
                type: 'Unauthenticated',
            })
        }

        const ctx: SDKContext = {
            ledgerProvider,
            userId: userId!,
            logger,
            error,
            defaultSynchronizerId:
                await SynchronizerResolver.resolveDefaultSynchronizerId(
                    ledgerProvider,
                    error,
                    options.synchronizerId
                ),
        }

        const config = {} as Pick<
            ExtendedSDKOptions,
            GetExtendedKeys<typeof options>
        >

        Object.entries(options).forEach(([item, value]) => {
            if (EXTENDED_SDK_OPTION_KEYS.some((k) => k === item) && value) {
                Object.defineProperty(config, item, {
                    value,
                    enumerable: true,
                })
            }
        })

        return await ExtendedInitializedSDK.create(ctx, config)
    }

    /**
     * @param options logAdapter to use for logging output
     * @returns An OfflineSdkInterface that has namespaces initialized that don't require any external connectivity
     */
    static createOffline(options?: {
        logAdapter?: AllowedLogAdapters
    }): OfflineSDKInterface {
        const logger = new SDKLogger(options?.logAdapter ?? 'pino')
        const error = new SDKErrorHandler(logger)
        return new OfflineInitializedSDK({ logger, error })
    }
}

export async function getValidatorParty(
    validatorUrl: URL,
    auth: AuthTokenProvider | TokenProviderConfig
): Promise<string>
/**
 * @deprecated The sdkLogger argument is no longer used. Configure SDK logging at the application level with @logtape. This argument will be removed in a future release.
 * @param validatorUrl
 * @param auth
 * @param sdkLogger
 */
export async function getValidatorParty(
    validatorUrl: URL,
    auth: AuthTokenProvider | TokenProviderConfig,
    sdkLogger: unknown
): Promise<string>
export async function getValidatorParty(
    validatorUrl: URL,
    auth: AuthTokenProvider | TokenProviderConfig,
    // oxlint-disable-next-line no-unused-vars
    sdkLogger?: unknown
) {
    const validatorAuth =
        auth instanceof AuthTokenProvider ? auth : new AuthTokenProvider(auth)
    const validator = new ValidatorInternalClient(validatorUrl, validatorAuth)
    return (await validator.get('/v0/validator-user')).party_id
}
