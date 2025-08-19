import { LedgerController, localLedgerDefault } from './ledgerController'
import { AuthController, LocalAuthDefault } from './authController'

export interface WalletSDK {
    ledger: LedgerController
    auth: AuthController
}

export class WalletSDKImpl implements WalletSDK {
    ledger!: LedgerController
    auth!: AuthController

    constructor() {
        this.auth = LocalAuthDefault()
        this.auth.getUserToken().then((token) => {
            this.ledger = localLedgerDefault(token.userId, token.token)
        })
    }

    setupAuthController(controller: AuthController): WalletSDK {
        this.auth = controller
        return this
    }

    connectLedger(userId: string, baseUrl: string, token: string): WalletSDK {
        this.ledger = new LedgerController(userId, baseUrl, token)
        return this
    }
}
