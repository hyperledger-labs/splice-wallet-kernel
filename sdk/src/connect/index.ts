import { discover, popupHref } from 'core-wallet-ui-components'
import { EventTypes, injectSpliceProvider } from 'core-splice-provider'
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
        .then(async (result) => {
            if (result.walletType === 'remote' && result.url) {
                const baseUrl = new URL(result.url)
                window.addEventListener('message', (event) =>
                    remoteHandler(baseUrl, event)
                )
            }

            const provider = injectSpliceProvider()
            provider.request({ method: 'connect' })

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

async function remoteHandler(baseUrl: URL, event: MessageEvent) {
    if (
        event.source !== window ||
        event.data.type !== EventTypes.SPLICE_WALLET_REQUEST
    )
        return

    if (event.data.error) {
        console.error('Error in remote request:', event.data.error)
        return
    }

    // const dApp = new DAppProvider({
    //     baseUrl: baseUrl,
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    // })
    // if (event.data.method === 'connect') {
    //     const result = await dApp.connect()
    //     await popupHref(result.userUrl)
    // }

    const result = await jsonRpcRequest<dappAPI.ConnectResult>(
        baseUrl.href,
        event.data.method,
        event.data.params
    )
    await popupHref(new URL(result.userUrl))
}

async function jsonRpcRequest<T>(
    url: string,
    method: string,
    params: unknown
): Promise<T> {
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params,
        }),
    })

    const body = await res.json()
    if (body.error) throw new Error(body.error.message)
    return body.result
}

export interface DAppRpcClientOptions {
    baseUrl?: URL
    headers?: Record<string, string>
}

export class DAppProvider {
    private client: dappAPI.SpliceWalletJSONRPCDAppAPI

    constructor(config: DAppRpcClientOptions = {}) {
        const url = config.baseUrl || new URL('http://localhost:3333')
        this.client = new dappAPI.SpliceWalletJSONRPCDAppAPI({
            transport: {
                type: url.protocol === 'https:' ? 'https' : 'http',
                host: url.host,
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
