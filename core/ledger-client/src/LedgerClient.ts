import { paths } from './generated-clients/openapi-3.4.0-SNAPSHOT.js'
import createClient, { Client } from 'openapi-fetch'

export type PartiesPostReq =
    paths['/v2/parties']['post']['requestBody']['content']['application/json']
export type PartiesPostRes =
    paths['/v2/parties']['post']['responses']['200']['content']['application/json']

export type InteractivePreparePostReq =
    paths['/v2/interactive-submission/prepare']['post']['requestBody']['content']['application/json']
export type InteractivePreparePostRes =
    paths['/v2/interactive-submission/prepare']['post']['responses']['200']['content']['application/json']

export type SubmitAndWaitPostReq =
    paths['/v2/commands/submit-and-wait']['post']['requestBody']['content']['application/json']
export type SubmitAndWaitPostRes =
    paths['/v2/commands/submit-and-wait']['post']['responses']['200']['content']['application/json']

// export function installFetchLogger() {
//   const originalFetch = global.fetch

//   global.fetch = async (...args) => {
//     const [input, init] = args
//     const method = init?.method || 'GET'
//     const url = typeof input === 'string' ? input : input?.url || '[unknown]'

//     logger.info({ method, url }, 'Outgoing fetch request')

//     try {
//       const response = await originalFetch(...args)
//       logger.info({
//         method,
//         url,
//         status: response.status,
//         statusText: response.statusText,
//       }, 'Fetch response')

//       return response
//     } catch (err) {
//       logger.error({ method, url, err }, 'Fetch failed')
//       throw err
//     }
//   }
// }

export class LedgerClient {
    private readonly client: Client<paths>
    private readonly getToken!: () => Promise<string>

    constructor(baseUrl: string, getToken: () => Promise<string>) {
        this.getToken = getToken
        this.client = createClient<paths>({
            baseUrl,
            fetch: async (url: RequestInfo, options: RequestInit = {}) => {
                const token = await this.getToken()
                return fetch(url, {
                    ...options,
                    headers: {
                        ...(options.headers || {}),
                        Authorization: `Bearer ${token}`,
                    },
                })
            },
        })
    }

    public async partiesPost(body: PartiesPostReq): Promise<PartiesPostRes> {
        const resp = await this.client.POST('/v2/parties', {
            body,
        })
        return this.valueOrError(resp)
    }

    // public async partiesGet(): Promise<PartiesPostRes> {
    //     const resp = await this.client.GET('/v2/parties')
    //     return this.valueOrError(resp)
    // }

    public async interactivePreparePost(
        body: InteractivePreparePostReq
    ): Promise<InteractivePreparePostRes> {
        const resp = await this.client.POST(
            '/v2/interactive-submission/prepare',
            { body }
        )

        return this.valueOrError(resp)
    }

    public async submitAndWaitPost(
        body: SubmitAndWaitPostReq
    ): Promise<SubmitAndWaitPostRes> {
        const resp = await this.client.POST('/v2/commands/submit-and-wait', {
            body,
        })

        return this.valueOrError(resp)
    }

    private async valueOrError<T>(response: {
        data?: T
        error?: unknown
    }): Promise<T> {
        if (response.data === undefined) {
            return Promise.reject(response.error)
        } else {
            return Promise.resolve(response.data)
        }
    }
}
