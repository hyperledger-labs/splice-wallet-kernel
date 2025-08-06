import {
    JsonRpcRequest,
    RequestPayload,
    ResponsePayload,
    RpcTransport,
} from 'core-types'
import { v4 as uuidv4 } from 'uuid'

export class HttpTransport implements RpcTransport {
    constructor(private url: string) {}

    isAuthed = false

    private _accessToken = ''

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
                Authorization: `Bearer ${this._accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        })

        if (!response.ok) {
            const body = await response.json()
            console.log(JSON.stringify(body))
            throw new Error(`HTTP error! status: ${response.status}, ${body}`)
        }

        const json = await response.json()
        return ResponsePayload.parse(json)
    }

    async useToken(token: string): Promise<void> {
        this.isAuthed = true
        this._accessToken = token
    }
}
