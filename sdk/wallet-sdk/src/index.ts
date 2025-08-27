import { AuthController, localAuthDefault } from './authController.js'
import { LedgerController, localLedgerDefault } from './ledgerController.js'
import {
    localTopologyDefault,
    TopologyController,
} from './topologyController.js'
import { Logger } from '@hyperledger-labs/core-types'

export * from './ledgerController.js'
export * from './authController.js'
export * from './topologyController.js'
export { signTransactionHash, createKeyPair } from '@splice/core-signing-lib'

type AuthFactory = () => AuthController
type LedgerFactory = (userId: string, token: string) => LedgerController
type TopologyFactory = (
    userId: string,
    adminAccessToken: string
) => TopologyController

export interface Config {
    authFactory: AuthFactory
    ledgerFactory: LedgerFactory
    topologyFactory: TopologyFactory | undefined
    logger?: Logger
}

export interface WalletSDK {
    auth: AuthController
    configure(config: Config): WalletSDK
    connect(): Promise<WalletSDK>
    connectAdmin(): Promise<WalletSDK>
    connectTopology(): Promise<WalletSDK>
    userLedger: LedgerController | undefined
    adminLedger: LedgerController | undefined
    topology: TopologyController | undefined
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

    private logger: Logger | undefined
    userLedger: LedgerController | undefined
    adminLedger: LedgerController | undefined
    topology: TopologyController | undefined

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
     * @returns A promise that resolves to the WalletSDK instance.
     */
    async connectTopology(): Promise<WalletSDK> {
        if (this.auth.userId === undefined)
            throw new Error('UserId is not defined in AuthController.')
        const { userId, accessToken } = await this.auth.getAdminToken()
        this.logger?.info(`Connecting user ${userId} with token ${accessToken}`)
        this.topology = this.topologyFactory(userId, accessToken)
        return this
    }
}
