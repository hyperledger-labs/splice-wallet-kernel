import { SpliceProviderBase, RequestArguments } from './SpliceProvider'

export class SpliceProviderHttp extends SpliceProviderBase {
    constructor(private url: URL) {
        super()
    }

    public async request<T>({ method, params }: RequestArguments): Promise<T> {
        return await SpliceProviderHttp.jsonRpcRequest(this.url, method, params)
    }

    static async jsonRpcRequest<T>(
        url: URL,
        method: string,
        params: unknown
    ): Promise<T> {
        const res = await fetch(url.href, {
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
}
