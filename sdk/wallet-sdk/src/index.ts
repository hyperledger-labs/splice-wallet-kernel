import { LedgerController } from './ledgerController'

export interface WalletSDK {
    ledger: LedgerController | undefined
}

export class WalletSDKImpl implements WalletSDK {
    ledger: LedgerController | undefined

    connectLedger(
        userId: string,
        baseUrl: string,
        adminApiUrl: string,
        token: string
    ): WalletSDK {
        this.ledger = new LedgerController(userId, baseUrl, adminApiUrl, token)
        return this
    }
}
