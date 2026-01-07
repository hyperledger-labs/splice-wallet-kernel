// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import {
    CHANNELS,
    GetActiveContractsRequest,
    JsGetUpdatesResponse,
    JsGetActiveContractsResponse,
    CompletionStreamResponse,
} from './generated-clients/asyncapi-3.4.7.js'
import { Logger } from 'pino'
import {
    TransactionFilterBySetup,
    TransactionFilterBySetup2,
} from './ledger-api-utils.js'
import { AccessTokenProvider } from '@canton-network/core-wallet-auth'

export class WebSocketClient {
    private ws: WebSocket | null = null
    private baseUrl: string
    private token: string
    private isAdmin: boolean
    private protocol: string[] = []
    private readonly logger: Logger
    private wsSupportBackOff: number
    private accessTokenProvider: AccessTokenProvider | undefined

    //TODO: add websocket options
    constructor({
        baseUrl,
        isAdmin,
        accessToken,
        accessTokenProvider,
        logger,
        wsSupportBackOff,
    }: {
        baseUrl: string
        isAdmin?: boolean
        accessToken?: string | undefined
        accessTokenProvider?: AccessTokenProvider | undefined
        logger: Logger
        wsSupportBackOff: number
    }) {
        this.logger = logger.child({ component: 'WebSocketClient' })
        this.baseUrl = baseUrl
        this.token = accessToken ?? ''
        this.wsSupportBackOff = wsSupportBackOff
        this.accessTokenProvider = accessTokenProvider
        this.isAdmin = isAdmin ?? false
    }

    async init() {
        if (this.accessTokenProvider) {
            this.token = this.isAdmin
                ? await this.accessTokenProvider.getAdminAccessToken()
                : await this.accessTokenProvider.getUserAccessToken()
        }

        this.logger.info(`ACCESS TOKEN IS : ${this.token}`)
        this.protocol = [`jwt.token.${this.token}`, 'daml.ws.auth']

        this.logger.info(
            `initializing websocket client with ${this.protocol.length} protocols`
        )
    }

    //TODO: return the subscription, not the ActiveContractsREsponse
    async subscribeToActiveContracts2(
        interfaceIds: string[],
        partyId: PartyId,
        offset?: number
    ) {
        await this.init()
        const wsUpdatesUrl = `${this.baseUrl}${CHANNELS.v2_state_active_contracts}`

        this.logger.info(`active contracts url: ${wsUpdatesUrl}`)
        const filter = TransactionFilterBySetup(interfaceIds, {
            partyId,
        })

        const request = {
            filter,
            verbose: false,
            activeAtOffset: offset ?? 0,
        }

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUpdatesUrl, this.protocol)
            const results: JsGetActiveContractsResponse[] = []
            let finished = false
            let error: Error | null = null
            setTimeout(() => {
                if (!finished && !error && results.length === 0) {
                    error = Error(
                        `No data received from WebSocket ${wsUpdatesUrl} within ${this.wsSupportBackOff}ms`
                    )
                    reject(error)
                    ws.close()
                }
            }, this.wsSupportBackOff)

            ws.onopen = () => {
                setTimeout(() => {
                    ws.send(JSON.stringify(request))
                }, this.wsSupportBackOff)
            }

            ws.onmessage = (event: MessageEvent<string>) => {
                try {
                    this.logger.info(`received event: ${event.data}`)
                    results.push(JSON.parse(event.data))
                } catch (err) {
                    this.logger.error(`Invalid JSON ${err}`)
                }
            }

            ws.onerror = () => {
                error = new Error(`WebSocket error`)
                reject(error)
            }

            ws.onclose = () => {
                finished = true
                if (!error) {
                    resolve({
                        updates: results,
                    })
                }
            }
        })
    }

    subscribeToActiveContractsStreaming(
        interfaceIds: string[],
        templateIds: string[],
        partyId: string,
        offset?: number
    ): AsyncIterableIterator<JsGetActiveContractsResponse> {
        const messageQueue: JsGetActiveContractsResponse[] = []
        let resolveNext: (() => void) | null = null
        let isClosed = false
        let streamError: Error | null = null

        // We create a wrapper generator
        const generator = async function* (this: WebSocketClient) {
            await this.init() // Now init happens inside the generator

            const wsUpdatesUrl = `${this.baseUrl}${CHANNELS.v2_state_active_contracts}`
            const request = {
                filter: TransactionFilterBySetup2(interfaceIds, templateIds, {
                    partyId,
                }),
                verbose: false,
                activeAtOffset: offset ?? 0,
            }

            this.logger.info(request, `DEBUGGING REQUEST`)

            const ws = new WebSocket(wsUpdatesUrl, this.protocol)

            ws.onopen = () => {
                this.logger.info(
                    `OPENING WEBSOCKET CONNECTION AND SENDING REQUEST`
                )
                ws.send(JSON.stringify(request))
            }
            ws.onmessage = (event) => {
                messageQueue.push(JSON.parse(event.data as string))
                this.logger.info(`Received event: ${event.data}`)
                resolveNext?.()
            }
            ws.onerror = () => {
                streamError = new Error('WebSocket Handshake/Connection failed')
                this.logger.error(`Encountered ws.onError`)
                isClosed = true
                resolveNext?.()
            }
            ws.onclose = (event: CloseEvent) => {
                this.logger.error(
                    `CLOSING WEBSOCKET CONNECTION code: ${event.code}, reason: ${event.reason}`
                )
                isClosed = true
                resolveNext?.()
            }

            try {
                while (true) {
                    if (messageQueue.length === 0) {
                        if (isClosed) break // Exit if closed and queue is empty
                        await new Promise<void>((r) => (resolveNext = r))
                    }

                    if (streamError) throw streamError

                    while (messageQueue.length > 0) {
                        yield messageQueue.shift()!
                    }

                    if (isClosed && messageQueue.length === 0) break
                }
            } finally {
                if (ws.readyState === WebSocket.OPEN) ws.close()
            }
        }

        return generator.call(this)
    }

    subscribeToUpdatesStreaming(
        beginExclusive: number,
        interfaceIds: string[],
        templateIds: string[],
        endInclusive?: number,
        partyId?: PartyId,
        verbose: boolean = true
    ): AsyncIterableIterator<JsGetUpdatesResponse> {
        const messageQueue: JsGetUpdatesResponse[] = []
        let resolveNext: (() => void) | null = null
        let isClosed = false
        let streamError: Error | null = null

        // We create a wrapper generator
        const generator = async function* (this: WebSocketClient) {
            await this.init() // Now init happens inside the generator

            const wsUpdatesUrl = `${this.baseUrl}${CHANNELS.v2_updates}`

            const filter = TransactionFilterBySetup2(
                interfaceIds,
                templateIds,
                {
                    partyId,
                }
            )

            const request = {
                beginExclusive,
                endInclusive,
                verbose,
                filter,
            }

            this.logger.info(request, `DEBUGGING REQUEST`)

            const ws = new WebSocket(wsUpdatesUrl, this.protocol)

            ws.onopen = () => {
                this.logger.info(
                    `OPENING WEBSOCKET CONNECTION AND SENDING REQUEST`
                )
                ws.send(JSON.stringify(request))
            }
            ws.onmessage = (event) => {
                messageQueue.push(JSON.parse(event.data as string))
                this.logger.info(`Received event: ${event.data}`)
                resolveNext?.()
            }
            ws.onerror = () => {
                streamError = new Error('WebSocket Handshake/Connection failed')
                this.logger.error(`Encountered ws.onError`)
                isClosed = true
                resolveNext?.()
            }
            ws.onclose = (event: CloseEvent) => {
                this.logger.error(
                    `CLOSING WEBSOCKET CONNECTION code: ${event.code}, reason: ${event.reason}`
                )
                isClosed = true
                resolveNext?.()
            }

            try {
                while (true) {
                    if (messageQueue.length === 0) {
                        if (isClosed) break // Exit if closed and queue is empty
                        await new Promise<void>((r) => (resolveNext = r))
                    }

                    if (streamError) throw streamError

                    while (messageQueue.length > 0) {
                        yield messageQueue.shift()!
                    }

                    if (isClosed && messageQueue.length === 0) break
                }
            } finally {
                if (ws.readyState === WebSocket.OPEN) ws.close()
            }
        }

        return generator.call(this)
    }

    async subscribeToActiveContracts(request: GetActiveContractsRequest) {
        const wsUpdatesUrl = `${this.baseUrl}${CHANNELS.v2_state_active_contracts}`

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUpdatesUrl, [
                `jwt.token.${this.token}`,
                'daml.ws.auth',
            ])
            const results: JsGetActiveContractsResponse[] = []
            let finished = false
            let error: Error | null = null
            setTimeout(() => {
                if (!finished && !error && results.length === 0) {
                    error = Error(
                        `No data received from WebSocket ${wsUpdatesUrl} within 60ms`
                    )
                    reject(error)
                    ws.close()
                }
            }, this.wsSupportBackOff)

            ws.onopen = () => {
                ws.send(JSON.stringify(request))
            }

            ws.onmessage = (event: MessageEvent<string>) => {
                try {
                    this.logger.info(`received event: ${event.data}`)
                    results.push(JSON.parse(event.data))
                } catch (err) {
                    this.logger.error(`Invalid JSON ${err}`)
                }
            }

            ws.onerror = () => {
                error = new Error(`WebSocket error`)
                reject(error)
            }

            ws.onclose = () => {
                finished = true
                if (!error) {
                    resolve({
                        updates: results,
                    })
                }
            }
        })
    }

    async subscribetoCompletions(
        userId: string,
        parties: PartyId[],
        beginExclusive: number
    ) {
        const wsUpdatesUrl = `${this.baseUrl}${CHANNELS.v2_commands_completions}`

        const request = {
            beginExclusive,
            userId,
            parties,
        }

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUpdatesUrl, this.protocol)
            const results: CompletionStreamResponse[] = []
            let finished = false
            let error: Error | null = null
            setTimeout(() => {
                if (!finished && !error && results.length === 0) {
                    error = Error(
                        `No data received from WebSocket ${wsUpdatesUrl} within 60ms`
                    )
                    reject(error)
                    ws.close()
                }
            }, this.wsSupportBackOff)

            ws.onopen = () => {
                ws.send(JSON.stringify(request))
            }

            ws.onmessage = (event: MessageEvent<string>) => {
                try {
                    this.logger.info(`received event: ${event.data}`)
                    results.push(JSON.parse(event.data))
                } catch (err) {
                    this.logger.error(`Invalid JSON ${err}`)
                }
            }

            ws.onerror = () => {
                error = new Error(`WebSocket error`)
                reject(error)
            }

            ws.onclose = () => {
                finished = true
                if (!error) {
                    resolve({
                        updates: results,
                    })
                }
            }
        })
    }

    async subscribeToUpdates(
        beginExclusive: number,
        interfaceNames: string[] | string,
        endInclusive?: number,
        partyId?: PartyId,
        verbose: boolean = true
    ) {
        const wsUpdatesUrl = `${this.baseUrl}${CHANNELS.v2_updates}`

        const filter = partyId
            ? TransactionFilterBySetup(interfaceNames, {
                  includeWildcard: true,
                  isMasterUser: false,
                  partyId,
              })
            : TransactionFilterBySetup(interfaceNames, {
                  includeWildcard: true,
                  isMasterUser: true,
                  partyId,
              })

        const request = {
            beginExclusive,
            endInclusive,
            verbose,
            filter,
        }

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUpdatesUrl, this.protocol)
            const results: JsGetUpdatesResponse[] = []
            let finished = false
            let error: Error | null = null
            setTimeout(() => {
                if (!finished && !error && results.length === 0) {
                    error = Error(
                        `No data received from WebSocket ${wsUpdatesUrl} within 60ms`
                    )
                    reject(error)
                    ws.close()
                }
            }, this.wsSupportBackOff)

            ws.onopen = () => {
                ws.send(JSON.stringify(request))
            }

            ws.onmessage = (event: MessageEvent<string>) => {
                try {
                    this.logger.info(`received event: ${event.data}`)
                    results.push(JSON.parse(event.data))
                } catch (err) {
                    this.logger.error(`Invalid JSON ${err}`)
                }
            }

            ws.onerror = () => {
                error = new Error(`WebSocket error`)
                reject(error)
            }

            ws.onclose = () => {
                finished = true
                if (!error) {
                    resolve({
                        updates: results,
                    })
                }
            }
        })
    }
}
