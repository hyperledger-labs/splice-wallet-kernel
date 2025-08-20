import { LedgerController, localLedgerDefault } from './ledgerController.js'
import { AuthController, localAuthDefault } from './authController.js'
import { Logger } from '@splice/core-types'

export * from './ledgerController.js'
export * from './authController.js'

export interface Config {
    createAuth?: () => AuthController
    createLedger?: (userId: string, token: string) => LedgerController
    logger?: Logger
}

export interface WalletSDK {
    auth: AuthController
    configure(config: Config): WalletSDK
    connect(): Promise<LedgerController>
    connectAdmin(): Promise<LedgerController>
}

export class WalletSDKImpl implements WalletSDK {
    auth: AuthController

    private createLedger: (userId: string, token: string) => LedgerController
    private logger: Logger | undefined

    constructor(
        auth: AuthController = localAuthDefault(),
        createLedger: (
            userId: string,
            token: string
        ) => LedgerController = localLedgerDefault
    ) {
        this.auth = auth
        this.createLedger = createLedger
    }

    configure(config: Config): WalletSDK {
        if (config.logger) this.logger = config.logger
        if (config.createAuth) this.auth = config.createAuth()
        if (config.createLedger) this.createLedger = config.createLedger
        return this
    }

    async connect(): Promise<LedgerController> {
        const { userId, accessToken } = await this.auth.getUserToken()
        this.logger?.info(`Connecting user ${userId} with token ${accessToken}`)
        return this.createLedger(userId, accessToken)
    }

    async connectAdmin(): Promise<LedgerController> {
        const { userId, accessToken } = await this.auth.getAdminToken()
        this.logger?.info(`Connecting user ${userId} with token ${accessToken}`)
        return this.createLedger(userId, accessToken)
    }
}
