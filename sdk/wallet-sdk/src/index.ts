import { LedgerController, localLedgerDefault } from './ledgerController.js'
import { AuthController, LocalAuthDefault } from './authController.js'

export interface Config {
    createLedger: (userId: string, token: string) => LedgerController
}

export interface WalletSDK {
    auth: AuthController
    configure(config: Config): WalletSDK
    connect(): Promise<LedgerController>
    connectAdmin(): Promise<LedgerController>
}

export class WalletSDKImpl implements WalletSDK {
    auth: AuthController

    private config: Config | undefined
    private createLedger: (userId: string, token: string) => LedgerController

    constructor(
        auth: AuthController = LocalAuthDefault(),
        createLedger: (
            userId: string,
            token: string
        ) => LedgerController = localLedgerDefault
    ) {
        this.auth = auth
        this.createLedger = createLedger
    }

    configure(config: Config): WalletSDK {
        this.config = config
        return this
    }

    async connect(): Promise<LedgerController> {
        const { userId, accessToken } = await this.auth.getUserToken()
        return this.createLedger(userId, accessToken)
    }

    async connectAdmin(): Promise<LedgerController> {
        const { userId, accessToken } = await this.auth.getAdminToken()
        return this.createLedger(userId, accessToken)
    }
}
