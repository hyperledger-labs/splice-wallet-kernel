// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthController, localNetAuthDefault } from './authController.js'
import { LedgerController, localNetLedgerDefault } from './ledgerController.js'
import {
    localNetTokenStandardDefault,
    TokenStandardController,
} from './tokenStandardController.js'
import { ScanProxyClient } from '@canton-network/core-splice-client'
import {
    localNetTopologyDefault,
    TopologyController,
} from './topologyController.js'
import { Logger } from '@canton-network/core-types'
import {
    localValidatorDefault,
    ValidatorController,
} from './validatorController.js'
export * from './ledgerController.js'
export * from './authController.js'
export * from './authTokenProvider.js'
export * from './topologyController.js'
export * from './tokenStandardController.js'
export * from './validatorController.js'
export {
    signTransactionHash,
    createKeyPair,
} from '@canton-network/core-signing-lib'
export { decodePreparedTransaction } from '@canton-network/core-tx-visualizer'
export {
    PreparedTransaction,
    Enums_ParticipantPermission,
} from '@canton-network/core-ledger-proto'
export * from './config.js'
import { PartyId } from '@canton-network/core-types'
import { AuthTokenProvider } from './authTokenProvider.js'

type AuthFactory = () => AuthController
type LedgerFactory = {
    /**
     * @deprecated This method will be removed with version 1.0.0, please use AuthTokenProvider version instead)
     */
    (userId: string, token: string, isAdmin: boolean): LedgerController
    (
        userId: string,
        authTokenProvider: AuthTokenProvider,
        isAdmin: boolean
    ): LedgerController
}
type LedgerFactoryWithCache = (
    userId: string,
    authTokenProvider: AuthTokenProvider,
    isAdmin: boolean
) => LedgerController

type TopologyFactory = {
    /**
     * @deprecated This method will be removed with version 1.0.0, please use AuthTokenProvider version instead)
     */
    (
        userId: string,
        adminAccessToken: string,
        synchronizerId: PartyId
    ): TopologyController
    (
        userId: string,
        authTokenProvider: AuthTokenProvider,
        synchronizerId: PartyId
    ): TopologyController
}
type TopologyFactoryWithCache = (
    userId: string,
    authTokenProvider: AuthTokenProvider,
    synchronizerId: PartyId
) => TopologyController

type TokenStandardFactory = {
    /**
     * @deprecated This method will be removed with version 1.0.0, please use AuthTokenProvider version instead)
     */
    (userId: string, token: string, isAdmin: boolean): TokenStandardController
    (
        userId: string,
        authTokenProvider: AuthTokenProvider,
        isAdmin: boolean
    ): TokenStandardController
}
type TokenStandardFactoryWithCache = (
    userId: string,
    authTokenProvider: AuthTokenProvider,
    isAdmin: boolean
) => TokenStandardController

type ValidatorFactory = {
    (userId: string, token: string): ValidatorController
    (userId: string, authTokenProvider: AuthTokenProvider): ValidatorController
}

type ValidatorFactoryWithCache = (
    userId: string,
    authTokenProvider: AuthTokenProvider
) => ValidatorController

export interface Config {
    authFactory?: AuthFactory
    ledgerFactory?: LedgerFactory | LedgerFactoryWithCache
    topologyFactory?: TopologyFactory
    tokenStandardFactory?: TokenStandardFactory
    validatorFactory?: ValidatorFactory
    logger?: Logger
}

export interface WalletSDK {
    auth: AuthController
    authTokenProvider: AuthTokenProvider
    configure(config: Config): WalletSDK
    connect(): Promise<WalletSDK>
    connectAdmin(): Promise<WalletSDK>
    connectTopology(synchronizer: PartyId | URL): Promise<WalletSDK>
    setPartyId(partyId: PartyId, synchronizerId?: PartyId): Promise<void>
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
    private _authTokenProvider: AuthTokenProvider

    get authTokenProvider(): AuthTokenProvider {
        return this._authTokenProvider
    }

    constructor() {
        this.auth = this.authFactory()
        this._authTokenProvider = new AuthTokenProvider(this.auth)
    }
    private authFactory: AuthFactory = localNetAuthDefault
    private ledgerFactory: LedgerFactory | LedgerFactoryWithCache =
        localNetLedgerDefault
    private topologyFactory: TopologyFactory | TopologyFactoryWithCache =
        localNetTopologyDefault
    private tokenStandardFactory:
        | TokenStandardFactory
        | TokenStandardFactoryWithCache = localNetTokenStandardDefault
    private validatorFactory: ValidatorFactory | ValidatorFactoryWithCache =
        localValidatorDefault

    private logger: Logger | undefined
    userLedger: LedgerController | undefined
    adminLedger: LedgerController | undefined
    topology: TopologyController | undefined
    tokenStandard: TokenStandardController | undefined
    validator: ValidatorController | undefined

    /**
     * Configures the SDK with the provided configuration.
     * @param config
     * @returns The configured WalletSDK instance.
     */
    configure(config: Config): WalletSDK {
        if (config.logger) this.logger = config.logger
        if (config.authFactory) {
            if (!this.auth || this.authFactory !== config.authFactory) {
                this.authFactory = config.authFactory
                this.auth = this.authFactory()
                this._authTokenProvider = new AuthTokenProvider(this.auth)
            }
        }
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
        const { userId } = await this.auth.getUserToken()
        this.userLedger = this.ledgerFactory(
            userId,
            this._authTokenProvider,
            false
        )
        this.tokenStandard = this.tokenStandardFactory(
            userId,
            this._authTokenProvider,
            false
        )
        this.validator = this.validatorFactory(userId, this._authTokenProvider)
        return this
    }

    /** Connects to the ledger using admin credentials.
     * @returns A promise that resolves to the WalletSDK instance.
     */
    async connectAdmin(): Promise<WalletSDK> {
        const { userId } = await this.auth.getAdminToken()
        this.adminLedger = this.ledgerFactory(
            userId,
            this._authTokenProvider,
            true
        )
        return this
    }

    /** Connects to the topology service using admin credentials.
     * @param synchronizer either the synchronizerId or the base url of the scanProxyClient.
     * @returns A promise that resolves to the WalletSDK instance.
     */
    async connectTopology(synchronizer: PartyId | URL): Promise<WalletSDK> {
        // TODO adjust the argument so it's clear whether synchronizerId or URL is passed
        if (this.auth.userId === undefined)
            throw new Error('UserId is not defined in AuthController.')
        if (synchronizer === undefined)
            throw new Error(
                'Synchronizer is not defined in connectTopology. Provide a synchronizerId'
            )
        const { userId } = await this.auth.getAdminToken()
        let synchronizerId: PartyId
        if (typeof synchronizer === 'string') {
            synchronizerId = synchronizer
        } else if (synchronizer instanceof URL) {
            const scanProxyClient = new ScanProxyClient(
                synchronizer,
                this.logger!,
                this._authTokenProvider
            )
            const amuletSynchronizerId =
                await scanProxyClient.getAmuletSynchronizerId()
            if (amuletSynchronizerId === undefined) {
                throw new Error(
                    'SynchronizerId is not defined in ScanProxyClient.'
                )
            } else {
                synchronizerId = amuletSynchronizerId as PartyId
            }
        } else
            throw new Error(
                'invalid Synchronizer format. Either provide a synchronizerId or a scanProxyClient base url.'
            )
        this.topology = this.topologyFactory(
            userId,
            this._authTokenProvider,
            synchronizerId
        )

        if (!this.userLedger) {
            this.logger?.warn(
                'userLedger is not defined, synchronizerId will not be set automatically. Consider calling sdk.connect() first'
            )
        }

        this.userLedger?.setSynchronizerId(synchronizerId)
        return this
    }

    /**
     * Sets the partyId (and synchronizerId) for all controllers except for adminLedger.
     * @param partyId the partyId to set.
     * @param synchronizerId optional synchronizerId, if the party is hosted on multiple synchronizers.
     */
    async setPartyId(
        partyId: PartyId,
        synchronizerId?: PartyId
    ): Promise<void> {
        let _synchronizerId: PartyId = synchronizerId ?? 'empty::empty'

        if (synchronizerId === undefined) {
            let synchronizer = await this.userLedger!.listSynchronizers(partyId)
            let retry = 0
            const maxRetries = 10

            while (true) {
                synchronizer = await this.userLedger!.listSynchronizers(partyId)
                if (
                    !synchronizer.connectedSynchronizers ||
                    synchronizer.connectedSynchronizers!.length !== 0
                ) {
                    _synchronizerId =
                        synchronizer!.connectedSynchronizers![0].synchronizerId
                    break
                } else {
                    retry++
                }
                if (retry > maxRetries)
                    throw new Error(
                        `Could not find any synchronizer id for ${partyId}`
                    )
                await new Promise((resolve) => setTimeout(resolve, 1000))
            }
        }

        this.logger?.info(`synchronizer id will be set to ${_synchronizerId}`)
        if (this.userLedger === undefined)
            this.logger?.warn(
                'User ledger controller is not defined, consider calling sdk.connect() first!'
            )
        else {
            this.logger?.info(
                `setting user ledger controller to use ${partyId}`
            )
            this.userLedger!.setPartyId(partyId)
            this.userLedger!.setSynchronizerId(_synchronizerId)
        }

        if (this.tokenStandard === undefined)
            this.logger?.warn(
                'token standard controller is not defined, consider calling sdk.connect() first!'
            )
        else {
            this.logger?.info(
                `setting token standard controller to use ${partyId}`
            )

            this.tokenStandard?.setPartyId(partyId)
            this.tokenStandard?.setSynchronizerId(_synchronizerId)
        }
        if (this.validator === undefined)
            this.logger?.warn('validator controller is not defined')

        this.validator?.setPartyId(partyId)
        this.validator?.setSynchronizerId(_synchronizerId)
    }
}
