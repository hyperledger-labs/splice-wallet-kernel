import { LedgerController } from './ledgerController'

export interface WalletSDK {
    ledger: LedgerController | undefined
}

export class WalletSDKImpl implements WalletSDK {
    ledger: LedgerController | undefined

    connectLedger(userId: string, baseUrl: string, token: string): WalletSDK {
        this.ledger = new LedgerController(userId, baseUrl, token)
        return this
    }
}
