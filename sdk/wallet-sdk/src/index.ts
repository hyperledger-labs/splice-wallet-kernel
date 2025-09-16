// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AuthController, localAuthDefault } from './authController.js'
import { LedgerController, localLedgerDefault } from './ledgerController.js'
import {
    localTokenStandardDefault,
    TokenStandardController,
} from './tokenStandardController.js'
import { ScanClient } from '@canton-network/core-splice-client'
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
import { PartyId } from '@canton-network/core-types'

type AuthFactory = () => AuthController
type LedgerFactory = (userId: string, token: string) => LedgerController
type TopologyFactory = (
    userId: string,
    adminAccessToken: string,
    synchronizerId: PartyId
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
        this.adminLedger = this.ledgerFactory(userId, accessToken)
        return this
    }

    /** Connects to the topology service using admin credentials.
     * @param synchronizer either the synchronizerId or the base url of the scanClient.
     * @returns A promise that resolves to the WalletSDK instance.
     */
    async connectTopology(synchronizer: PartyId | URL): Promise<WalletSDK> {
        if (this.auth.userId === undefined)
            throw new Error('UserId is not defined in AuthController.')
        if (synchronizer === undefined)
            throw new Error(
                'Synchronizer is not defined in connectTopology. Either provide a synchronizerId or a scanClient base url.'
            )
        const { userId, accessToken } = await this.auth.getAdminToken()
        let synchronizerId: PartyId
        if (typeof synchronizer === 'string') {
            synchronizerId = synchronizer
        } else if (synchronizer instanceof URL) {
            const scanClient = new ScanClient(
                synchronizer.href,
                this.logger!,
                accessToken
            )
            const amuletSynchronizerId =
                await scanClient.GetAmuletSynchronizerId()
            if (amuletSynchronizerId === undefined) {
                throw new Error('SynchronizerId is not defined in ScanClient.')
            } else {
                synchronizerId = amuletSynchronizerId as PartyId
            }
        } else
            throw new Error(
                'invalid Synchronizer format. Either provide a synchronizerId or a scanClient base url.'
            )
        this.topology = this.topologyFactory(
            userId,
            accessToken,
            synchronizerId
        )
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
        const _synchronizerId: PartyId =
            synchronizerId ??
            (await this.userLedger!.listSynchronizers(partyId))!
                .connectedSynchronizers![0].synchronizerId

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
