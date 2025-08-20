import { LedgerController } from './ledgerController'
import { TopologyController } from './topologyController'

export interface WalletSDK {
    ledger: LedgerController | undefined
    topology: TopologyController | undefined
}

export class WalletSDKImpl implements WalletSDK {
    ledger: LedgerController | undefined
    topology: TopologyController | undefined

    connectLedger(userId: string, baseUrl: string, token: string): WalletSDK {
        this.ledger = new LedgerController(userId, baseUrl, token)
        return this
    }

    connectTopology(
        adminApiUrl: string,
        baseUrl: string,
        userId: string,
        userAdminToken: string
    ): WalletSDK {
        this.topology = new TopologyController(
            adminApiUrl,
            baseUrl,
            userId,
            userAdminToken
        )
        return this
    }
}
