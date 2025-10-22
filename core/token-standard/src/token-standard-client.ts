// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import createClient, { Client } from 'openapi-fetch'
import { AccessTokenProvider, Logger } from '@canton-network/core-types'

import { paths as allocationPaths } from './generated-clients/splice-api-token-allocation-v1/allocation-v1.js'
import { paths as allocationInstructionPaths } from './generated-clients/splice-api-token-allocation-instruction-v1/allocation-instruction-v1.js'
import { paths as metadataPaths } from './generated-clients/splice-api-token-metadata-v1/token-metadata-v1.js'
import { paths as transferInstructionPaths } from './generated-clients/splice-api-token-transfer-instruction-v1/transfer-instruction-v1.js'

export { components as allocationRegistryTypes } from './generated-clients/splice-api-token-allocation-v1/allocation-v1.js'
export { components as metadataRegistryTypes } from './generated-clients/splice-api-token-metadata-v1/token-metadata-v1.js'
export { components as transferInstructionRegistryTypes } from './generated-clients/splice-api-token-transfer-instruction-v1/transfer-instruction-v1.js'
export { components as allocationInstructionRegistryTypes } from './generated-clients/splice-api-token-allocation-instruction-v1/allocation-instruction-v1.js'

type paths = allocationPaths &
    metadataPaths &
    transferInstructionPaths &
    allocationInstructionPaths

// A conditional type that filters the set of OpenAPI path names to those that actually have a defined POST operation.
// Any path without a POST is excluded via the `never` branch of the conditional
type PostEndpoint = {
    [Pathname in keyof paths]: paths[Pathname] extends {
        post: unknown
    }
        ? Pathname
        : never
}[keyof paths]

// Given a pathname (string) that has a POST, this helper type extracts the request body type from the OpenAPI definition.
export type PostRequest<Path extends PostEndpoint> = paths[Path] extends {
    post: { requestBody: { content: { 'application/json': infer Req } } }
}
    ? Req
    : never

// Given a pathname (string) that has a POST, this helper type extracts the 200 response type from the OpenAPI definition.
export type PostResponse<Path extends PostEndpoint> = paths[Path] extends {
    post: { responses: { 200: { content: { 'application/json': infer Res } } } }
}
    ? Res
    : never

// Similar as above, for GETs
type GetEndpoint = {
    [Pathname in keyof paths]: paths[Pathname] extends {
        get: unknown
    }
        ? Pathname
        : never
}[keyof paths]

// Similar as above, for GETs
export type GetResponse<Path extends GetEndpoint> = paths[Path] extends {
    get: { responses: { 200: { content: { 'application/json': infer Res } } } }
}
    ? Res
    : never

export class TokenStandardClient {
    private readonly client: Client<paths>
    private readonly logger: Logger
    private accessTokenProvider: AccessTokenProvider | undefined

    constructor(
        baseUrl: string,
        logger: Logger,
        isAdmin: boolean,
        accessToken?: string,
        accessTokenProvider?: AccessTokenProvider
    ) {
        this.accessTokenProvider = accessTokenProvider
        this.logger = logger
        this.logger.debug({ baseUrl }, 'TokenStandardClient initialized')
        this.client = createClient<paths>({
            baseUrl,
            fetch: async (url: RequestInfo, options: RequestInit = {}) => {
                if (this.accessTokenProvider) {
                    accessToken = isAdmin
                        ? await this.accessTokenProvider.getAdminAccessToken()
                        : await this.accessTokenProvider.getUserAccessToken()
                }
                return fetch(url, {
                    ...options,
                    headers: {
                        ...(options.headers || {}),
                        ...(accessToken
                            ? { Authorization: `Bearer ${accessToken}` }
                            : {}),
                        'Content-Type': 'application/json',
                    },
                })
            },
        })
    }

    public async post<Path extends PostEndpoint>(
        path: Path,
        body: PostRequest<Path>,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string>
        }
    ): Promise<PostResponse<Path>> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- (cant align this with openapi-fetch generics :shrug:)
        const options = { body, params } as any
        this.logger.debug({ requestBody: body }, `POST ${path}`)
        const resp = await this.client.POST(path, options)
        this.logger.debug({ requestBody: body, response: resp }, `POST ${path}`)
        return this.valueOrError(resp)
    }

    public async get<Path extends GetEndpoint>(
        path: Path,
        params?: {
            path?: Record<string, string>
            query?: Record<string, string>
        }
    ): Promise<GetResponse<Path>> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- (cant align this with openapi-fetch generics :shrug:)
        const options = { params } as any

        const resp = await this.client.GET(path, options)
        this.logger.debug(
            { path: path, params: params, response: resp },
            `GET ${path}`
        )
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
