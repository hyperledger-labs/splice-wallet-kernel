import { HttpTransport, RequestPayload } from 'core-types'

export class HttpClient {
    private transport: HttpTransport

    constructor(url: URL, sessionToken?: string) {
        this.transport = new HttpTransport(url, sessionToken)
    }

    public async request<T>({ method, params }: RequestPayload): Promise<T> {
        const response = await this.transport.submit({ method, params })
        if ('error' in response) throw new Error(response.error.message)
        return response.result as T
    }
}
