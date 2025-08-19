import { LedgerController, localLedgerDefault } from './ledgerController.js'
import { AuthController, LocalAuthDefault } from './authController.js'

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
            console.log('User token received:', token)
            this.ledger = localLedgerDefault(token.userId, token.token)
        })
        while (this.ledger === undefined) {
            // Wait for the ledger to be initialized
        }
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
