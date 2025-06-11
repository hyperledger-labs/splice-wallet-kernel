import { discover } from './discovery'
import * as dappAPI from 'core-wallet-dapp-rpc-client'

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

export class DAppClient {
    private client: dappAPI.SpliceWalletJSONRPCDAppAPI

    constructor(config: DAppRpcClientOptions = {}) {
        const url = new URL(config.baseUrl || 'http://localhost:3333')
        this.client = new dappAPI.SpliceWalletJSONRPCDAppAPI({
            transport: {
                type: 'http',
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
