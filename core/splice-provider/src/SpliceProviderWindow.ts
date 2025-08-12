import { RequestPayload, WindowTransport } from 'core-types'
import { SpliceProviderBase } from './SpliceProvider.js'

export class SpliceProviderWindow extends SpliceProviderBase {
    private transport: WindowTransport

    constructor() {
        super()
        this.transport = new WindowTransport(window)
    }

    public async request<T>({ method, params }: RequestPayload): Promise<T> {
        const response = await this.transport.submit({ method, params })
        return response.result as T
    }
}
