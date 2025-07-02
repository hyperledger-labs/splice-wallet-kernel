import { JsonRpcRequest, RequestPayload } from 'core-types'
import { v4 as uuidv4 } from 'uuid'

export async function jsonRpcFetch(url: string, payload: RequestPayload) {
    const request: JsonRpcRequest = {
        jsonrpc: '2.0',
        method: payload.method,
        params: payload.params,
        id: uuidv4(),
    }

    const authToken = 'not-a-real-token'

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    })

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
}
