// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { LedgerClient } from '@canton-network/core-ledger-client'
import { WebSocketClient } from '@canton-network/core-asyncapi-client'
import { ScanProxyClient } from '@canton-network/core-splice-client'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { AmuletService } from '@canton-network/core-amulet-service'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'
import { Logger } from 'pino'
import { KeysClient } from './keys'

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

export class Sdk {
    private ledgerClient: LedgerClient //TODO: Switch to LedgerProvider when available (#1284)
    private asyncClient: WebSocketClient
    private scanProxyClient: ScanProxyClient
    private tokenStandardService: TokenStandardService
    private amuletService: AmuletService
    private registries: URL[]

    constructor(options: WalletSdkOptions) {
        this.ledgerClient = new LedgerClient({
            baseUrl: options.ledgerClientUrl,
            logger: options.logger,
            accessTokenProvider: options.authTokenProvider,
            version: '3.4', //TODO: decide whether we want to drop 3.3 support in wallet sdk v1
            isAdmin: options.isAdmin ?? false,
        })
        this.asyncClient = new WebSocketClient({
            baseUrl:
                options.websocketUrl?.toString() ??
                `ws://${options.ledgerClientUrl.host}`,
            accessTokenProvider: options.authTokenProvider,
            isAdmin: options.isAdmin ?? false,
            logger: options.logger,
        })

        this.scanProxyClient = new ScanProxyClient(
            new URL(options.validatorUrl),
            options.logger,
            options.isAdmin ?? false,
            undefined, // as part of v1 we want to remove string typed access token (#803). we should modify the ScanProxyClient constructor to use named parameters and the ScanClient to accept accessTokenProvider
            options.authTokenProvider
        )
        this.tokenStandardService = new TokenStandardService(
            this.ledgerClient,
            options.logger,
            options.authTokenProvider,
            options.isAdmin ?? false
        )

        this.amuletService = new AmuletService(
            this.tokenStandardService,
            this.scanProxyClient,
            undefined
        )

        this.registries = options.registries
    }

    public keys = new KeysClient()

    //TODO: implement other namespaces (#1270)

    // public get ledger() {}

    // public get token() {}

    // public get amulet() {}

    // public get party() {}

    // public get registries() {}

    // public get events() {}
}
