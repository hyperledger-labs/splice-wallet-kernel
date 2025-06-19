import { discover } from 'core-wallet-ui-components'
import { injectSpliceProvider } from 'core-splice-provider'
import * as dappAPI from 'core-wallet-dapp-rpc-client'

export * from 'core-splice-provider'

export enum ErrorCode {
    UserCancelled,
    Other,
}

type ConnectResult = {
    status: 'success'
    url: string
}

export type ConnectError = {
    status: 'error'
    error: ErrorCode
    details: string
}

export async function connect(): Promise<ConnectResult> {
    return discover()
        .then((result) => {
            if (result.walletType === 'remote') {
                const provider = injectSpliceProvider()

                // TODO: Replace with actual connection logic
                setTimeout(() => {
                    provider.emit('connect', {
                        chainId: 'TODO: replace with hex chain ID?',
                    })
                }, 1000)
            }

            return {
                status: 'success',
                url: result.url,
            } as ConnectResult
        })
        .catch((err) => {
            throw {
                status: 'error',
                error: ErrorCode.Other,
                details: err instanceof Error ? err.message : String(err),
            } as ConnectError
        })
}

export interface DAppRpcClientOptions {
    baseUrl?: string
    headers?: Record<string, string>
}

export class DAppProvider {
    private client: dappAPI.SpliceWalletJSONRPCDAppAPI

    constructor(config: DAppRpcClientOptions = {}) {
        const url = new URL(config.baseUrl || 'http://localhost:3333')
        this.client = new dappAPI.SpliceWalletJSONRPCDAppAPI({
            transport: {
                type: url.protocol === 'https:' ? 'https' : 'http',
                host: url.hostname,
                port: parseInt(url.port),
                path: url.pathname && url.pathname !== '/' ? url.pathname : '',
                protocol: '2.0',
            },
        })
    }

    public async connect() {
        return this.client.connect()
    }
}
