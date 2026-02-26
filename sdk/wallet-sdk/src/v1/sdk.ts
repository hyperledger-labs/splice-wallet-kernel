// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { WebSocketClient } from '@canton-network/core-asyncapi-client'
import { ScanProxyClient } from '@canton-network/core-splice-client'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { AmuletService } from '@canton-network/core-amulet-service'
import { AuthTokenProvider } from '../authTokenProvider.js'
import { KeysClient } from './keys/index.js'
import { Ledger } from './ledger/index.js'
import { SdkLogger } from './logger/index.js'
import { AllowedLogAdapters } from './logger/types.js'
import { Logger } from 'pino'
import CustomLogAdapter from './logger/adapter/custom.js' // eslint-disable-line @typescript-eslint/no-unused-vars -- for JSDoc only
import { Asset } from './registries/types.js'
import { Amulet } from './amulet/index.js'
import { Token } from './token/index.js'
import Party from './party/client.js'
import { LedgerProvider } from '@canton-network/core-provider-ledger'

export * from './registries/types.js'

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
    ledgerClient: LedgerClient
    asyncClient: WebSocketClient
    scanProxyClient: ScanProxyClient
    tokenStandardService: TokenStandardService
    amuletService: AmuletService
    userId: string
    registries: URL[]
    logger: SdkLogger
    assetList: Asset[]
}

export { PrepareOptions, ExecuteOptions, ExecuteFn } from './ledger/index.js'
export * from './transactions/prepared.js'
export * from './transactions/signed.js'

export class Sdk {
    public readonly keys: KeysClient
    public readonly party: Party

    public readonly ledger: Ledger

    public readonly amulet: Amulet

    public readonly token: Token

    private constructor(private readonly ctx: WalletSdkContext) {
        this.keys = new KeysClient()
        this.amulet = new Amulet(this.ctx)
        this.token = new Token(this.ctx)

        //TODO: implement other namespaces (#1270)

        // public ledger()

        // public token()

        // public amulet() {}
        this.ledger = new Ledger(this.ctx)

        this.party = new Party(this.ctx)

        // public registries() {}

        // public events() {}
    }

    static async create(options: WalletSdkOptions): Promise<Sdk> {
        const isAdmin = options.isAdmin ?? false

        const userId = isAdmin
            ? (await options.authTokenProvider.getAdminAuthContext()).userId
            : (await options.authTokenProvider.getUserAuthContext()).userId

        const logger = new SdkLogger(options.logAdapter ?? 'pino')

        const legacyLogger = logger as unknown as Logger // TODO: remove when not needed anymore

        const wsUrl =
            options.websocketUrl ?? deriveWebSocketUrl(options.ledgerClientUrl)

        const ledgerProvider = new LedgerProvider({
            baseUrl: options.ledgerClientUrl,
            accessTokenProvider: options.authTokenProvider,
        })

        const ledgerClient = new LedgerClient({
            baseUrl: options.ledgerClientUrl,
            logger: legacyLogger,
            accessTokenProvider: options.authTokenProvider,
            version: '3.4', //TODO: decide whether we want to drop 3.3 support in wallet sdk v1
            isAdmin,
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

        const provider = new LedgerProvider({
            baseUrl: options.ledgerClientUrl,
            accessTokenProvider: options.authTokenProvider,
        })
        const tokenStandardService = new TokenStandardService(
            provider,
            ledgerClient,
            logger,
            options.authTokenProvider,
            options.isAdmin ?? false
        )

        const amuletService = new AmuletService(
            tokenStandardService,
            scanProxyClient,
            undefined
        )

        // Initialize clients that require it
        await Promise.all([ledgerClient.init()])

        const assetList: Asset[] =
            await tokenStandardService.registriesToAssets(
                options.registries.map((url) => url.href)
            )

        const context = {
            ledgerProvider,
            ledgerClient,
            asyncClient,
            scanProxyClient,
            tokenStandardService,
            amuletService,
            registries: options.registries,
            assetList,
            userId,
            logger,
        }
        return new Sdk(context)
    }
}

function deriveWebSocketUrl(ledgerClientUrl: URL): URL {
    const wsUrl = new URL(ledgerClientUrl)

    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'

    return wsUrl
}
