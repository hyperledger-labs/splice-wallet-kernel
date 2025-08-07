import { RequestPayload, WindowTransport } from 'core-types'
import { SpliceProviderBase } from './SpliceProvider.js'

export class SpliceProviderWindow extends SpliceProviderBase {
    private transport: WindowTransport

    constructor() {
        super()
        this.transport = new WindowTransport(window)
    }

    public async request<T>({ method, params }: RequestPayload): Promise<T> {
        console.log('SpliceProviderWindow request:', method, params)
        const response = await this.transport.submit({ method, params })
        console.log('SpliceProviderWindow response:', response)
        return response.result as T
    }
}
