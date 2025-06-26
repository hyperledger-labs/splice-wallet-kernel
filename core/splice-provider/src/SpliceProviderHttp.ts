import { RequestPayload } from 'core-types'
import { SpliceProviderBase } from './SpliceProvider'

export class SpliceProviderHttp extends SpliceProviderBase {
    constructor(
        private url: URL,
        private sessionToken?: string
    ) {
        super()
        this.on('onConnected', (args) => {
            if (
                args &&
                args instanceof Object &&
                'sessionToken' in args &&
                typeof args.sessionToken === 'string'
            ) {
                console.log(
                    `SpliceProviderHttp: setting sessionToken to ${args.sessionToken}`
                )
                this.sessionToken = args.sessionToken
            } else {
                console.log(
                    `SpliceProviderHttp: onConnected event did not contain a valid sessionToken`
                )
            }
        })
    }

    public async request<T>({ method, params }: RequestPayload): Promise<T> {
        return await this.jsonRpcRequest(this.url, method, params)
    }

    async jsonRpcRequest<T>(
        url: URL,
        method: string,
        params: unknown
    ): Promise<T> {
        const res = await fetch(url.href, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(this.sessionToken && {
                    Authorization: `Bearer ${this.sessionToken}`,
                }),
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
