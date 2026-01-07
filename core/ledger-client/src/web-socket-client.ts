// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import {
    CHANNELS,
    GetActiveContractsRequest,
    JsGetUpdatesResponse,
    JsGetActiveContractsResponse,
} from './generated-clients/asyncapi-3.4.7.js'
import { Logger } from 'pino'
import { TransactionFilterBySetup } from './ledger-api-utils.js'
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

        // const authProtocol = `jwt.token.${this.token}, daml.ws.auth)`
        const authProtocol = [`jwt.token.${this.token}`, 'daml.ws.auth']

        this.logger.info(`ACCESS TOKEN IS : ${this.token}`)
        this.logger.info(`Auth protocol is  : ${authProtocol}`)
        this.protocol.push(...authProtocol)
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

    async *subscribeToActiveContractsStreaming(
        interfaceIds: string[],
        partyId: PartyId,
        offset?: number
    ): AsyncIterableIterator<JsGetActiveContractsResponse> {
        await this.init()
        const wsUpdatesUrl = `${this.baseUrl}${CHANNELS.v2_state_active_contracts}`

        const filter = TransactionFilterBySetup(interfaceIds, { partyId })
        const request = {
            filter,
            verbose: false,
            activeAtOffset: offset ?? 0,
        }

        // Use a queue to buffer messages between the WS callback and the Generator yield
        const messageQueue: JsGetActiveContractsResponse[] = []
        let resolveNext: ((value: void) => void) | null = null
        let isClosed = false
        let streamError: Error | null = null

        const ws = new WebSocket(wsUpdatesUrl, this.protocol)

        ws.onopen = () => {
            // Send request after small backoff if required by your server
            setTimeout(
                () => ws.send(JSON.stringify(request)),
                this.wsSupportBackOff
            )
        }

        ws.onmessage = (event: MessageEvent<string>) => {
            try {
                const data = JSON.parse(event.data)
                messageQueue.push(data)
                if (resolveNext) {
                    resolveNext()
                    resolveNext = null
                }
            } catch (err) {
                this.logger.error(`Invalid JSON: ${err}`)
            }
        }

        ws.onerror = () => {
            streamError = new Error('WebSocket connection error')
            if (resolveNext) resolveNext()
        }

        ws.onclose = () => {
            isClosed = true
            if (resolveNext) resolveNext()
        }

        // The Background Loop: Keep yielding as long as connection is open or queue has items
        try {
            while (!isClosed || messageQueue.length > 0) {
                if (messageQueue.length === 0) {
                    // Wait for the next message or close event
                    await new Promise<void>((resolve) => {
                        resolveNext = resolve
                    })
                }

                if (streamError) throw streamError

                while (messageQueue.length > 0) {
                    yield messageQueue.shift()!
                }
            }
        } finally {
            // Ensure cleanup if the consumer breaks the loop early
            if (ws.readyState === WebSocket.OPEN) {
                ws.close()
            }
        }
    }

    async subscribeToActiveContracts(request: GetActiveContractsRequest) {
        const wsUpdatesUrl = `${this.baseUrl}${CHANNELS.v2_state_active_contracts}`

        return new Promise((resolve, reject) => {
            const ws = new WebSocket(wsUpdatesUrl, this.protocol)
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
