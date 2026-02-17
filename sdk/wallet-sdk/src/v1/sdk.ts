// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { WebSocketClient } from '@canton-network/core-asyncapi-client'
import { ScanProxyClient } from '@canton-network/core-splice-client'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { AmuletService } from '@canton-network/core-amulet-service'
import { AuthTokenProvider } from '../authTokenProvider.js'
import { Logger } from 'pino'
import { KeysClient } from './keys/index.js'
import ExternalPartyClient from './party/externalClient.js'
import InternalPartyClient from './party/internalClient.js'
import { Ledger } from './ledger/index.js'

export type WalletSdkOptions = {
    readonly logger: Logger // TODO: client should be able to provide a logger (#1286)
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
    ledgerClient: LedgerClient
    asyncClient: WebSocketClient
    scanProxyClient: ScanProxyClient
    tokenStandardService: TokenStandardService
    amuletService: AmuletService
    registries: URL[]
    logger: Logger
}

export { PrepareOptions, ExecuteOptions, ExecuteFn } from './ledger/index.js'
export * from './transactions/prepared.js'
export * from './transactions/signed.js'

export class Sdk {
    public readonly keys: KeysClient
    public readonly party: {
        readonly external: ExternalPartyClient
        readonly internal: InternalPartyClient
    }

    public readonly ledger: Ledger

    private constructor(private readonly ctx: WalletSdkContext) {
        this.keys = new KeysClient()

        //TODO: implement other namespaces (#1270)

        // public ledger()

        // public token()

        // public amulet() {}
        this.ledger = new Ledger(this.ctx)

        this.party = {
            external: new ExternalPartyClient(this.ctx),
            internal: new InternalPartyClient(),
        }

        // public registries() {}

        // public events() {}
    }

    static async create(options: WalletSdkOptions): Promise<Sdk> {
        const isAdmin = options.isAdmin ?? false

        const wsUrl =
            options.websocketUrl ?? deriveWebSocketUrl(options.ledgerClientUrl)

        const ledgerClient = new LedgerClient({
            baseUrl: options.ledgerClientUrl,
            logger: options.logger,
            accessTokenProvider: options.authTokenProvider,
            version: '3.4', //TODO: decide whether we want to drop 3.3 support in wallet sdk v1
            isAdmin,
        })
        const asyncClient = new WebSocketClient({
            baseUrl: wsUrl.toString(),
            accessTokenProvider: options.authTokenProvider,
            isAdmin,
            logger: options.logger,
        })

        const scanProxyClient = new ScanProxyClient(
            options.scanApiBaseUrl ??
                new URL(`http://${options.ledgerClientUrl.host}`),
            options.logger,
            isAdmin,
            undefined, // as part of v1 we want to remove string typed access token (#803). we should modify the ScanProxyClient constructor to use named parameters and the ScanClient to accept accessTokenProvider
            options.authTokenProvider
        )
        const tokenStandardService = new TokenStandardService(
            ledgerClient,
            options.logger,
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

        const context = {
            ledgerClient,
            asyncClient,
            scanProxyClient,
            tokenStandardService,
            amuletService,
            registries: options.registries,
            logger: options.logger,
        }
        return new Sdk(context)
    }
}

function deriveWebSocketUrl(ledgerClientUrl: URL): URL {
    const wsUrl = new URL(ledgerClientUrl)

    wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:'

    return wsUrl
}
