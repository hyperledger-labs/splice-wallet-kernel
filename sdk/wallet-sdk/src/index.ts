import { AuthController, localAuthDefault } from './authController.js'
import { LedgerController, localLedgerDefault } from './ledgerController.js'
import {
    localTokenStandardDefault,
    TokenStandardController,
} from './tokenStandardController.js'
import { ScanClient } from '@canton-network/core-scan-client'
import {
    localTopologyDefault,
    TopologyController,
} from './topologyController.js'
import { Logger } from '@canton-network/core-types'

export * from './ledgerController.js'
export * from './authController.js'
export * from './topologyController.js'
export * from './tokenStandardController.js'
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

export interface Config {
    authFactory: AuthFactory
    ledgerFactory: LedgerFactory
    topologyFactory?: TopologyFactory
    tokenStandardFactory?: TokenStandardFactory
    logger?: Logger
}

export interface WalletSDK {
    auth: AuthController
    configure(config: Config): WalletSDK
    connect(): Promise<WalletSDK>
    connectAdmin(): Promise<WalletSDK>
    connectTopology(synchronizer: string | ScanClient): Promise<WalletSDK>
    userLedger: LedgerController | undefined
    adminLedger: LedgerController | undefined
    topology: TopologyController | undefined
    tokenStandard: TokenStandardController | undefined
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

    private logger: Logger | undefined
    userLedger: LedgerController | undefined
    adminLedger: LedgerController | undefined
    topology: TopologyController | undefined
    tokenStandard: TokenStandardController | undefined

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
    async connectTopology(synchronizer: string): Promise<WalletSDK> {
        if (this.auth.userId === undefined)
            throw new Error('UserId is not defined in AuthController.')
        if (synchronizer === undefined)
            throw new Error(
                'Synchronizer is not defined in connectTopology. Either provide a synchronizerId or a scanClient base url.'
            )
        const { userId, accessToken } = await this.auth.getAdminToken()
        this.logger?.info(`Connecting user ${userId} with token ${accessToken}`)
        let synchronizerId: string
        if (synchronizer.includes('::')) {
            synchronizerId = synchronizer
        } else if (synchronizer.startsWith('http')) {
            const scanClient = new ScanClient(
                synchronizer,
                this.logger!,
                accessToken
            )
            const amuletSynchronizerId =
                await scanClient.GetAmuletSynchronizerId()
            if (amuletSynchronizerId === undefined) {
                throw new Error('SynchronizerId is not defined in ScanClient.')
            } else {
                synchronizerId = amuletSynchronizerId
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
}
