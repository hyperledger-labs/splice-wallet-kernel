// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WebSocketClient } from '@canton-network/core-asyncapi-client'
import {
    ScanClient,
    ScanProxyClient,
    ValidatorInternalClient,
} from '@canton-network/core-splice-client'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { AmuletService } from '@canton-network/core-amulet-service'
import {
    AuthTokenProvider,
    TokenProviderConfig,
} from '@canton-network/core-wallet-auth'
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
import { PartyId } from '@canton-network/core-types'
import Party from './namespace/party/client.js'
import { SdkUtils } from './utils/index.js'
import { AcsReader } from '@canton-network/core-acs-reader'
import { UserService } from './namespace/user/index.js'
import { Ops } from '@canton-network/core-provider-ledger'
export * from './namespace/asset/index.js'
export type * from './namespace/token/index.js'
export { type TokenProviderConfig } from '@canton-network/core-wallet-auth'

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
    auth: TokenProviderConfig
    ledgerClientUrl: string | URL
    tokenStandardUrl: string | URL
    validatorUrl: string | URL
    registries: string[] | URL[]
    websocketUrl?: string | URL // default to same host as ledgerClientUrl with ws protocol
    scanApiBaseUrl?: string | URL
    isAdmin?: boolean
}

export type WalletSdkContext = {
    ledgerProvider: LedgerProvider
    asyncClient: WebSocketClient
    scanProxyClient: ScanProxyClient
    tokenStandardService: TokenStandardService
    amuletService: AmuletService
    userId: string
    registries: URL[]
    validatorParty: PartyId
    logger: SDKLogger
    error: SDKErrorHandler
    asset: Asset
    acsReader: AcsReader
    defaultSynchronizerId: string
}

export type MinimalContext = {
    ledgerProvider: LedgerProvider
    acsReader: AcsReader
    userId: string
    logger: SDKLogger
    error: SDKErrorHandler
    defaultSynchronizerId: string
}

export { PrepareOptions, ExecuteOptions } from './namespace/ledger/index.js'
export * from './namespace/transactions/prepared.js'
export * from './namespace/transactions/signed.js'

export class Sdk {
    public readonly keys: KeysClient
    public readonly party: Party

    public readonly ledger: Ledger

    public readonly amulet: Amulet

    public readonly token: Token

    public readonly utils: SdkUtils
    public readonly asset: Asset
    public readonly user: UserService

    private constructor(private readonly ctx: WalletSdkContext) {
        const minimalContext: MinimalContext = {
            ledgerProvider: this.ctx.ledgerProvider,
            acsReader: this.ctx.acsReader,
            userId: this.ctx.userId,
            logger: this.ctx.logger,
            error: this.ctx.error,
            defaultSynchronizerId: this.ctx.defaultSynchronizerId,
        }

        this.keys = new KeysClient()
        this.amulet = new Amulet(this.ctx)
        this.token = new Token(this.ctx)
        this.ledger = new Ledger(minimalContext)
        this.party = new Party(minimalContext)
        this.utils = new SdkUtils(minimalContext)
        this.user = new UserService(minimalContext)

        this.asset = new Asset({
            tokenStandardService: this.ctx.tokenStandardService,
            registries: this.ctx.registries,
            error: this.ctx.error,
            list: this.ctx.asset.list,
        })
        //TODO: implement other namespaces (#1270)

        // public events() {}
    }

    static async create(options: WalletSdkOptions): Promise<Sdk> {
        const logger = new SDKLogger(options.logAdapter ?? 'pino')

        const authTokenProvider = new AuthTokenProvider(options.auth, logger)

        const { userId } = await authTokenProvider.getAuthContext()

        const error = new SDKErrorHandler(logger)

        const legacyLogger = logger as unknown as Logger // TODO: remove when not needed anymore

        const wsUrl =
            options.websocketUrl ??
            deriveWebSocketUrl(toURL(options.ledgerClientUrl))
        const ledgerApiUrl = toURL(options.ledgerClientUrl)
        const validatorUrl = toURL(options.validatorUrl)

        const ledgerProvider = new LedgerProvider({
            baseUrl: ledgerApiUrl,
            accessTokenProvider: authTokenProvider,
        })

        const asyncClient = new WebSocketClient({
            baseUrl: wsUrl.toString(),
            accessTokenProvider: authTokenProvider,
            logger: legacyLogger,
        })

        const scanProxyClient = new ScanProxyClient(
            validatorUrl,
            logger,
            authTokenProvider
        )
        const validator = new ValidatorInternalClient(
            validatorUrl,
            logger,
            authTokenProvider
        )
        const validatorParty = (await validator.get('/v0/validator-user'))
            .party_id

        const connectedSynchronizers =
            await ledgerProvider.request<Ops.GetV2StateConnectedSynchronizers>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/state/connected-synchronizers',
                    requestMethod: 'get',
                    query: {},
                },
            })

        if (!connectedSynchronizers.connectedSynchronizers?.[0]) {
            throw new Error('No connected synchronizers found')
        }

        const defaultSynchronizerId =
            connectedSynchronizers.connectedSynchronizers[0].synchronizerId
        if (connectedSynchronizers.connectedSynchronizers.length > 1) {
            logger.warn(
                `Found ${connectedSynchronizers.connectedSynchronizers.length} synchronizers, defaulting to ${defaultSynchronizerId}`
            )
        }

        const tokenStandardService = new TokenStandardService(
            ledgerProvider,
            logger,
            authTokenProvider,
            options.isAdmin ?? false
        )

        // TODO remove as soon as ScanProxy gets endpoint for traffic-status
        const scanApiUrl = options.scanApiBaseUrl
            ? toURL(options.scanApiBaseUrl)
            : undefined
        const scanClient = new ScanClient(
            scanApiUrl ?? new URL(`http://${ledgerApiUrl.host}`),
            logger,
            authTokenProvider
        )
        const amuletService = new AmuletService(
            tokenStandardService,
            scanProxyClient,
            scanClient
        )

        const registries = options.registries.map((r) => toURL(r))
        const asset = new Asset({
            tokenStandardService,
            registries,
            error,
            list: await tokenStandardService.registriesToAssets(
                registries.map((url) => url.href)
            ),
        })

        const acsReader = new AcsReader(ledgerProvider)

        const context = {
            ledgerProvider,
            asyncClient,
            scanProxyClient,
            tokenStandardService,
            amuletService,
            registries,
            userId,
            logger,
            validatorParty,
            error,
            asset,
            acsReader,
            defaultSynchronizerId,
        }
        return new Sdk(context)
    }
}

function deriveWebSocketUrl(ledgerClientUrl: URL): URL {
    const wsUrl = new URL(ledgerClientUrl)

    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'

    return wsUrl
}

function toURL(input: string | URL): URL {
    return typeof input === 'string' ? new URL(input) : input
}
