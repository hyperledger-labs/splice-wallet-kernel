import { paths } from './generated-clients/openapi-3.4.0-SNAPSHOT.js'
import createClient, { Client } from 'openapi-fetch'
import { Logger } from 'pino'

export type InteractivePreparePostReq =
    paths['/v2/interactive-submission/prepare']['post']['requestBody']['content']['application/json']
export type InteractivePreparePostRes =
    paths['/v2/interactive-submission/prepare']['post']['responses']['200']['content']['application/json']

export type PartiesPostReq =
    paths['/v2/parties']['post']['requestBody']['content']['application/json']
export type GrantUserRightsReq =
    paths['/v2/users/{user-id}/rights']['post']['requestBody']['content']['application/json']
export type PartiesPostRes =
    paths['/v2/parties']['post']['responses']['200']['content']['application/json']

export type PartiesParticipantIdRes =
    paths['/v2/parties/participant-id']['get']['responses']['200']['content']['application/json']

export type SubmitAndWaitPostReq =
    paths['/v2/commands/submit-and-wait']['post']['requestBody']['content']['application/json']
export type SubmitAndWaitPostRes =
    paths['/v2/commands/submit-and-wait']['post']['responses']['200']['content']['application/json']

export class LedgerClient {
    private readonly client: Client<paths>
    private readonly logger: Logger

    constructor(baseUrl: string, token: string, _logger: Logger) {
        this.logger = _logger.child({ component: 'LedgerClient' })
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

    public async partiesPost(
        body: PartiesPostReq,
        userId: string
    ): Promise<PartiesPostRes> {
        const res = await this.post<PartiesPostReq, PartiesPostRes>(
            '/v2/parties',
            body
        )
        await this.post<GrantUserRightsReq, unknown>(
            `/v2/users/${userId}/rights` as keyof paths,
            {
                identityProviderId: '',
                userId,
                rights: [
                    {
                        kind: {
                            CanActAs: {
                                value: {
                                    party: res.partyDetails!.party,
                                },
                            },
                        },
                    },
                ],
            }
        )
        return res
    }

    public async partiesParticipantIdGet(): Promise<PartiesParticipantIdRes> {
        return this.get('/v2/parties/participant-id')
    }

    public async submitAndWaitPost(
        body: SubmitAndWaitPostReq
    ): Promise<SubmitAndWaitPostRes> {
        return this.post('/v2/commands/submit-and-wait', body)
    }

    private async get<Res>(path: keyof paths): Promise<Res> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resp = await this.client.GET(path as any, {})
        this.logger.debug({ response: resp }, `GET ${path}`)
        return this.valueOrError(resp)
    }

    private async post<Req, Res>(path: keyof paths, body: Req): Promise<Res> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const resp = await this.client.POST(path as any, { body })
        this.logger.debug({ requestBody: body, response: resp }, `POST ${path}`)
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
