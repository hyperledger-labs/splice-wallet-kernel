// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WebSocketClient } from '@canton-network/core-asyncapi-client'
import {
    ScanProxyClient,
    ValidatorInternalClient,
} from '@canton-network/core-splice-client'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { AmuletService } from '@canton-network/core-amulet-service'
import { AuthTokenProvider } from '../authTokenProvider.js'
import { KeysClient } from './namespace/keys/index.js'
import { Ledger } from './namespace/ledger/index.js'
import { SDKLogger } from './logger/logger.js'
import { AllowedLogAdapters } from './logger/types.js'
import { Logger } from 'pino'
import CustomLogAdapter from './logger/adapter/custom.js' // eslint-disable-line @typescript-eslint/no-unused-vars -- for JSDoc only
import { Asset } from './namespace/asset/index.js'
import { Amulet } from './namespace/amulet/index.js'
import { Token } from './namespace/token/index.js'
import { SDKErrorHandler } from './error/handler.js'
import { LedgerProvider } from '@canton-network/core-provider-ledger'
import Party from './namespace/party/client.js'
import { Ping } from './namespace/ping/index.js'

export * from './namespace/asset/index.js'

/**
 * Options for configuring the Wallet SDK instance.
 *
 * @property logAdapter Optional. Specifies which logging adapter to use for SDK logs.
 *   Allows integration with different logging backends (e.g., 'console', 'pino', or a custom adapter - see {@link CustomLogAdapter}).
 *   If not provided, a default adapter (pino) is used. This enables customization of log output and integration
 *   with application-wide logging strategies.
 */
export type WalletSdkOptions = {
    readonly logAdapter?: AllowedLogAdapters
    authTokenProvider: AuthTokenProvider
    ledgerClientUrl: URL
    tokenStandardUrl: URL
    validatorUrl: URL
    registries: URL[]
    websocketUrl?: URL // default to same host as ledgerClientUrl with ws protocol
    scanApiBaseUrl?: URL
    isAdmin?: boolean
}

export type WalletSdkContext = {
    ledgerProvider: LedgerProvider
    asyncClient: WebSocketClient
    scanProxyClient: ScanProxyClient
    tokenStandardService: TokenStandardService
    amuletService: AmuletService
    validator: ValidatorInternalClient
    userId: string
    registries: URL[]
    logger: SDKLogger
    error: SDKErrorHandler
    asset: Asset
}

export {
    PrepareOptions,
    ExecuteOptions,
    ExecuteFn,
} from './namespace/ledger/index.js'
export * from './namespace/transactions/prepared.js'
export * from './namespace/transactions/signed.js'

export class Sdk {
    public readonly keys: KeysClient
    public readonly party: Party

    public readonly ledger: Ledger

    public readonly amulet: Amulet

    public readonly token: Token

    public readonly ping: Ping

    private constructor(private readonly ctx: WalletSdkContext) {
        this.keys = new KeysClient()
        this.amulet = new Amulet(this.ctx)
        this.token = new Token(this.ctx)

        //TODO: implement other namespaces (#1270)

        this.ledger = new Ledger(this.ctx)

        this.party = new Party(this.ctx)
        this.ping = new Ping(this.ctx)

        // public registries() {}

        // public events() {}
    }

    static async create(options: WalletSdkOptions): Promise<Sdk> {
        const isAdmin = options.isAdmin ?? false

        const userId = isAdmin
            ? (await options.authTokenProvider.getAdminAuthContext()).userId
            : (await options.authTokenProvider.getUserAuthContext()).userId

        const logger = new SDKLogger(options.logAdapter ?? 'pino')

        const error = new SDKErrorHandler(logger)

        const legacyLogger = logger as unknown as Logger // TODO: remove when not needed anymore

        const wsUrl =
            options.websocketUrl ?? deriveWebSocketUrl(options.ledgerClientUrl)

        const ledgerProvider = new LedgerProvider({
            baseUrl: options.ledgerClientUrl,
            accessTokenProvider: options.authTokenProvider,
        })

        const asyncClient = new WebSocketClient({
            baseUrl: wsUrl.toString(),
            accessTokenProvider: options.authTokenProvider,
            isAdmin,
            logger: legacyLogger,
        })

        const scanProxyClient = new ScanProxyClient(
            options.scanApiBaseUrl ??
                new URL(`http://${options.ledgerClientUrl.host}`),
            logger,
            isAdmin,
            undefined, // as part of v1 we want to remove string typed access token (#803). we should modify the ScanProxyClient constructor to use named parameters and the ScanClient to accept accessTokenProvider
            options.authTokenProvider
        )
        const validator = new ValidatorInternalClient(
            options.validatorUrl,
            logger,
            isAdmin,
            undefined,
            options.authTokenProvider
        )
        const tokenStandardService = new TokenStandardService(
            ledgerProvider,
            logger,
            options.authTokenProvider,
            options.isAdmin ?? false
        )

        const amuletService = new AmuletService(
            tokenStandardService,
            scanProxyClient,
            undefined
        )

        const asset = new Asset({
            tokenStandardService,
            registries: options.registries,
            error,
        })

        const context = {
            ledgerProvider,
            asyncClient,
            scanProxyClient,
            tokenStandardService,
            amuletService,
            validator,
            registries: options.registries,
            userId,
            logger,
            error,
            asset,
        }
        return new Sdk(context)
    }
}

function deriveWebSocketUrl(ledgerClientUrl: URL): URL {
    const wsUrl = new URL(ledgerClientUrl)

    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'

    return wsUrl
}
