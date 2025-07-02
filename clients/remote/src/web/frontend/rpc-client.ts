import { JsonRpcRequest, RequestPayload, ResponsePayload } from 'core-types'
import { v4 as uuidv4 } from 'uuid'

import { RpcTransport } from 'core-types'
import UserApiClient from 'core-wallet-user-rpc-client'

// TODO(#131) - move this to rpc-transport package
class HttpTransport implements RpcTransport {
    constructor(private url: string) {}

    async submit(payload: RequestPayload): Promise<ResponsePayload> {
        const request: JsonRpcRequest = {
            jsonrpc: '2.0',
            method: payload.method,
            params: payload.params,
            id: uuidv4(),
        }

        const response = await fetch(this.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        })

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        return response.json()
    }
}

export const userClient = new UserApiClient(
    new HttpTransport('http://localhost:3001/rpc')
)
