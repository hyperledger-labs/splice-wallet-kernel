// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthController, localAuthDefault } from './authController.js'
import { LedgerController, localLedgerDefault } from './ledgerController.js'
import {
    localTokenStandardDefault,
    TokenStandardController,
} from './tokenStandardController.js'
import { ScanProxyClient } from '@canton-network/core-splice-client'
import {
    localTopologyDefault,
    TopologyController,
} from './topologyController.js'
import { Logger } from '@canton-network/core-types'
import {
    localValidatorDefault,
    ValidatorController,
} from './validatorController.js'
export * from './ledgerController.js'
export * from './authController.js'
export * from './topologyController.js'
export * from './tokenStandardController.js'
export * from './validatorController.js'
export {
    signTransactionHash,
    createKeyPair,
} from '@canton-network/core-signing-lib'
export { decodePreparedTransaction } from '@canton-network/core-tx-visualizer'
export { PreparedTransaction } from '@canton-network/core-ledger-proto'

type AuthFactory = () => AuthController
type LedgerFactory = (userId: string, token: string) => LedgerController
type TopologyFactory = (
    userId: string,
    adminAccessToken: string,
    synchronizerId: string
) => TopologyController
type TokenStandardFactory = (
    userId: string,
    token: string
) => TokenStandardController
type ValidatorFactory = (userId: string, token: string) => ValidatorController

export interface Config {
    authFactory: AuthFactory
    ledgerFactory: LedgerFactory
    topologyFactory?: TopologyFactory
    tokenStandardFactory?: TokenStandardFactory
    validatorFactory?: ValidatorFactory
    logger?: Logger
}

export interface WalletSDK {
    auth: AuthController
    configure(config: Config): WalletSDK
    connect(): Promise<WalletSDK>
    connectAdmin(): Promise<WalletSDK>
    connectTopology(synchronizer: string | URL): Promise<WalletSDK>
    userLedger: LedgerController | undefined
    adminLedger: LedgerController | undefined
    topology: TopologyController | undefined
    tokenStandard: TokenStandardController | undefined
    validator: ValidatorController | undefined
}

/**
 * WalletSDKImpl is the main entry point for interacting with the wallet SDK.
 * It provides the overall control and connectivity through different components.
 * Some components are optional and can be configured as needed.
 */
export class WalletSDKImpl implements WalletSDK {
    auth: AuthController

    private authFactory: AuthFactory = localAuthDefault
    private ledgerFactory: LedgerFactory = localLedgerDefault
    private topologyFactory: TopologyFactory = localTopologyDefault
    private tokenStandardFactory: TokenStandardFactory =
        localTokenStandardDefault
    private validatorFactory: ValidatorFactory = localValidatorDefault

    private logger: Logger | undefined
    userLedger: LedgerController | undefined
    adminLedger: LedgerController | undefined
    topology: TopologyController | undefined
    tokenStandard: TokenStandardController | undefined
    validator: ValidatorController | undefined

    constructor() {
        this.auth = this.authFactory()
    }

    /**
     * Configures the SDK with the provided configuration.
     * @param config
     * @returns The configured WalletSDK instance.
     */
    configure(config: Config): WalletSDK {
        if (config.logger) this.logger = config.logger
        if (config.authFactory) this.auth = config.authFactory()
        if (config.ledgerFactory) this.ledgerFactory = config.ledgerFactory
        if (config.topologyFactory)
            this.topologyFactory = config.topologyFactory
        if (config.tokenStandardFactory)
            this.tokenStandardFactory = config.tokenStandardFactory
        if (config.validatorFactory)
            this.validatorFactory = config.validatorFactory
        return this
    }

    /**
     * Connects to the ledger using user credentials.
     * Initializes the userLedger property.
     * @returns A promise that resolves to the WalletSDK instance.
     */
    async connect(): Promise<WalletSDK> {
        const { userId, accessToken } = await this.auth.getUserToken()
        this.logger?.info(`Connecting user ${userId} with token ${accessToken}`)
        this.userLedger = this.ledgerFactory(userId, accessToken)
        this.tokenStandard = this.tokenStandardFactory(userId, accessToken)
        this.validator = this.validatorFactory(userId, accessToken)
        return this
    }

    /** Connects to the ledger using admin credentials.
     * @returns A promise that resolves to the WalletSDK instance.
     */
    async connectAdmin(): Promise<WalletSDK> {
        const { userId, accessToken } = await this.auth.getAdminToken()
        this.logger?.info(`Connecting user ${userId} with token ${accessToken}`)
        this.adminLedger = this.ledgerFactory(userId, accessToken)
        return this
    }

    /** Connects to the topology service using admin credentials.
     * @param synchronizer either the synchronizerId or the base url of the scanProxyClient.
     * @returns A promise that resolves to the WalletSDK instance.
     */
    async connectTopology(synchronizer: string | URL): Promise<WalletSDK> {
        // TODO adjust the argument so it's clear whether synchronizerId or URL is passed
        if (this.auth.userId === undefined)
            throw new Error('UserId is not defined in AuthController.')
        if (synchronizer === undefined)
            throw new Error(
                'Synchronizer is not defined in connectTopology. Provide a synchronizerId'
            )
        const { userId, accessToken } = await this.auth.getAdminToken()
        let synchronizerId: string
        if (typeof synchronizer === 'string') {
            synchronizerId = synchronizer
        } else if (synchronizer instanceof URL) {
            const scanProxyClient = new ScanProxyClient(
                synchronizer,
                this.logger!,
                accessToken
            )
            const amuletSynchronizerId =
                await scanProxyClient.getAmuletSynchronizerId()
            if (amuletSynchronizerId === undefined) {
                throw new Error(
                    'SynchronizerId is not defined in ScanProxyClient.'
                )
            } else {
                synchronizerId = amuletSynchronizerId
            }
        } else
            throw new Error(
                'invalid Synchronizer format. Either provide a synchronizerId or a scanProxyClient base url.'
            )
        this.topology = this.topologyFactory(
            userId,
            accessToken,
            synchronizerId
        )
        return this
    }
}
