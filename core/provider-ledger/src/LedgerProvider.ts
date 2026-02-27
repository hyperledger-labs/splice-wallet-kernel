// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AbstractProvider } from '@canton-network/core-splice-provider'
import { PartyId, RequestArgs } from '@canton-network/core-types'
import { LedgerTypes, v3_4 } from '@canton-network/core-ledger-client-types'
import {
    GetEndpoint,
    LedgerClient,
    PostEndpoint,
} from '@canton-network/core-ledger-client'
import pino from 'pino'
import { AccessTokenProvider } from '@canton-network/core-wallet-auth'
import { Ops } from '.'

export class LedgerProvider extends AbstractProvider<LedgerTypes> {
    private client: LedgerClient

    constructor({
        baseUrl,
        accessTokenProvider,
    }: {
        baseUrl: string | URL
        accessTokenProvider: AccessTokenProvider
    }) {
        super()
        this.client = new LedgerClient({
            baseUrl: typeof baseUrl === 'string' ? new URL(baseUrl) : baseUrl,
            accessTokenProvider,
            // TODO: use some generalized logger
            logger: pino({ name: 'LedgerProvider' }),
        })
    }

    /**
     *
     * Example usage:
     *
     * const provider = new LedgerProvider(...)
     *
     * // Caveat: TypeScript can infer the correct params body based on the method + API path, but the result will be typed as `unknown` without a type argument:
     *
     * const result1 = await provider.request({ method: 'ledgerApi', params: { ... } });
     * //    ^ type = `unknown`
     *
     *
     * // Specify an operation type to get a fully typed result:
     *
     * const result2 = await provider.request<Ops.PostV2Parties>({ method: 'ledgerApi', params: { ... } });
     * //    ^ type = `PostV2Parties['ledgerApi']['result']`
     *
     * @param args
     * @returns
     */
    public async request<L extends LedgerTypes>(
        args: RequestArgs<L, 'ledgerApi'>
    ): Promise<L['ledgerApi']['result']> {
        console.log('Received request:', args)

        if (args.method === 'ledgerApi' && 'params' in args) {
            if (args.params.resource === '/v2/state/active-contracts') {
                const bodyParams = args.params
                    .body as Ops.PostV2StateActiveContracts['ledgerApi']['params']['body']
                const queryParams = args.params
                    .query as Ops.PostV2StateActiveContracts['ledgerApi']['params']['query']
                const convertedParams = this.convert(
                    bodyParams,
                    queryParams.limit
                )
                return await this.client.activeContracts(convertedParams)
            }

            switch (args.params.requestMethod) {
                case 'get': {
                    const params = this.getLedgerParams(args.params)

                    return await this.client.getWithRetry(
                        args.params.resource as GetEndpoint, // TODO: casting is necessary b/c of v3.3/v3.4 differences
                        undefined,
                        params
                    )
                }
                case 'post': {
                    const params = this.getLedgerParams(args.params)
                    const body = 'body' in args.params ? args.params.body : {}

                    return await this.client.postWithRetry(
                        args.params.resource as PostEndpoint, // TODO: casting is necessary b/c of v3.3/v3.4 differences
                        body as never, // TODO: need to fix client typing
                        undefined,
                        params
                    )
                }
                // TODO: generalize LedgerClient to support any HTTP method
                case 'delete':
                case 'patch':
                default: {
                    throw new Error(
                        `Unsupported request method: ${args.params.requestMethod}`
                    )
                }
            }
        } else {
            throw new Error(`Unsupported method: ${args.method}`)
        }
    }

    private convert(
        request: Ops.PostV2StateActiveContracts['ledgerApi']['params']['body'],
        limit?: number
    ) {
        const templateIds = new Set<string>()
        const interfaceIds = new Set<string>()
        const parties = new Set<PartyId>()

        const filtersByParty = request.filter?.filtersByParty

        if (filtersByParty) {
            const cleanFilters = filtersByParty as Record<
                string,
                v3_4.components['schemas']['Filters']
            >

            for (const [party, filter] of Object.entries(cleanFilters)) {
                parties.add(party)

                filter.cumulative?.forEach((f) => {
                    const idFilter = f.identifierFilter

                    if (
                        'TemplateFilter' in idFilter &&
                        idFilter.TemplateFilter.value.templateId
                    ) {
                        templateIds.add(
                            idFilter.TemplateFilter.value.templateId
                        )
                    }
                    if (
                        'InterfaceFilter' in idFilter &&
                        idFilter.InterfaceFilter.value.interfaceId
                    ) {
                        interfaceIds.add(
                            idFilter.InterfaceFilter.value.interfaceId
                        )
                    }
                })
            }
        }

        return {
            offset: request.activeAtOffset,
            ...(templateIds.size > 0 ? { templateIds: [...templateIds] } : {}),
            ...(interfaceIds.size > 0
                ? { interfaceIds: [...interfaceIds] }
                : {}),
            ...(parties.size > 0 ? { parties: [...parties] } : {}),
            ...(limit !== undefined ? { limit } : {}),
        }
    }

    private getLedgerParams(params: object): {
        path?: Record<string, string>
        query?: Record<string, string>
    } {
        const extracted = {}

        if ('path' in params) {
            Object.assign(extracted, { path: params.path })
        }

        if ('query' in params) {
            Object.assign(extracted, { query: params.query })
        }

        return extracted
    }
}
