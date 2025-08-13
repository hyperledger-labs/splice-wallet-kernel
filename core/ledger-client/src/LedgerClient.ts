import { paths } from './generated-clients/openapi-3.4.0-SNAPSHOT.js'
import createClient, { Client, ClientPathsWithMethod } from 'openapi-fetch'
import { Logger } from 'pino'

export type InteractivePreparePostReq =
    paths['/v2/interactive-submission/prepare']['post']['requestBody']['content']['application/json']
export type InteractivePreparePostRes =
    paths['/v2/interactive-submission/prepare']['post']['responses']['200']['content']['application/json']

export type PartiesPostReq =
    paths['/v2/parties']['post']['requestBody']['content']['application/json']
export type PartiesPostRes =
    paths['/v2/parties']['post']['responses']['200']['content']['application/json']

export type PartiesParticipantIdRes =
    paths['/v2/parties/participant-id']['get']['responses']['200']['content']['application/json']

export type SubmitAndWaitPostReq =
    paths['/v2/commands/submit-and-wait']['post']['requestBody']['content']['application/json']
export type SubmitAndWaitPostRes =
    paths['/v2/commands/submit-and-wait']['post']['responses']['200']['content']['application/json']

export type ActiveContractsPostReq =
    paths['/v2/state/active-contracts']['post']['requestBody']['content']['application/json']
export type ActiveContractsPostRes =
    paths['/v2/state/active-contracts']['post']['responses']['200']['content']['application/json']

export type LedgerEndGetRes =
    paths['/v2/state/ledger-end']['get']['responses']['200']['content']['application/json']

export type GetUserByIdRes =
    paths['/v2/users/{user-id}']['get']['responses']['200']['content']['application/json']

export class LedgerClient {
    private readonly client: Client<paths>

    constructor(
        baseUrl: string,
        token: string,
        private logger: Logger
    ) {
        this.client = createClient<paths>({
            baseUrl,
            fetch: async (url: RequestInfo, options: RequestInit = {}) => {
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

    public async interactivePreparePost(
        body: InteractivePreparePostReq
    ): Promise<InteractivePreparePostRes> {
        return this.post('/v2/interactive-submission/prepare', body)
    }

    public async partiesPost(body: PartiesPostReq): Promise<PartiesPostRes> {
        return this.post('/v2/parties', body)
    }

    public async partiesParticipantIdGet(): Promise<PartiesParticipantIdRes> {
        return this.get('/v2/parties/participant-id')
    }

    public async submitAndWaitPost(
        body: SubmitAndWaitPostReq
    ): Promise<SubmitAndWaitPostRes> {
        return this.post('/v2/commands/submit-and-wait', body)
    }

    public async getUserById(userId: string): Promise<GetUserByIdRes> {
        return this.get('/v2/users/{user-id}', {
            params: { path: { 'user-id': userId } },
        })
    }

    public async getActiveContracts(
        body: ActiveContractsPostReq
    ): Promise<ActiveContractsPostRes> {
        return this.post('/v2/state/active-contracts', body)
    }

    public async getLedgerEnd(): Promise<LedgerEndGetRes> {
        return this.get('/v2/state/ledger-end')
    }

    private async get<Res>(
        path: ClientPathsWithMethod<Client<paths>, 'get'>,
        params: Record<string, unknown> = {}
    ): Promise<Res> {
        const resp = await this.client.GET(path, params)
        this.logger.debug({ response: resp }, `LedgerClient: GET ${path}`)
        // @ts-expect-error reason TBS
        return await this.valueOrError<Res>(resp)
    }

    private async post<Req, Res>(
        path: ClientPathsWithMethod<Client<paths>, 'post'>,
        body: Req
    ): Promise<Res> {
        // @ts-expect-error reason TBS
        const resp = await this.client.POST(path, { body })
        this.logger.debug(
            { requestBody: body, response: resp },
            `LedgerClient: POST ${path}`
        )
        // @ts-expect-error reason TBS
        return this.valueOrError<Res>(resp)
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
