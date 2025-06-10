import HttpTransport from '@open-rpc/client-js'
import WalletJSONRPCDAppAPI from './index'

export interface DAppRpcClientConfig {
    baseUrl?: string
}

export class DAppClient {
    private client: WalletJSONRPCDAppAPI

    constructor(config: DAppRpcClientConfig = {}) {
        const transport = new HttpTransport(
            config.baseUrl || 'http://localhost:3333'
        )
        this.client = new WalletJSONRPCDAppAPI({ transport })
    }

    public async connect() {
        return this.client.connect()
    }
}
