import { JsonRpcRequest, RequestPayload, ResponsePayload } from 'core-types'
import { v4 as uuidv4 } from 'uuid'

import { RpcTransport } from 'core-types'
import UserApiClient from 'core-wallet-user-rpc-client'
import { config } from './config'
import { stateManager } from './state-manager'

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

        const authToken = stateManager.accessToken.get()
        const header = authToken
            ? { Authorization: `Bearer ${authToken}` }
            : undefined

        const response = await fetch(this.url, {
            method: 'POST',
            headers: {
                ...header,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        })

        if (!response.ok) {
            if (response.status === 401) {
                // Handle unauthorized access, e.g., clear token
                stateManager.accessToken.clear()
            }
            const errorMessage = await response.text()
            console.log(response.status)
            console.log(`error message is ${errorMessage}`)
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        const json = await response.json()
        return ResponsePayload.parse(json)
    }
}

export const userClient = new UserApiClient(
    new HttpTransport(config.userRpcUri)
)
