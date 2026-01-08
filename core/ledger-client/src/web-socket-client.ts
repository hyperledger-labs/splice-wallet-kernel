// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import {
    CHANNELS,
    JsGetUpdatesResponse,
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
        this.protocol = [`jwt.token.${this.token}`, 'daml.ws.auth']

        this.logger.info(
            `initializing websocket client with ${this.protocol.length} protocols`
        )
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

        const generator = async function* (this: WebSocketClient) {
            await this.init()

            const wsUpdatesUrl = `${this.baseUrl}${CHANNELS.v2_updates}`

            const filter = TransactionFilterBySetup(interfaceIds, templateIds, {
                partyId,
            })

            const request = {
                beginExclusive,
                endInclusive,
                verbose,
                filter,
            }

            this.logger.debug(request, `v2/updates request`)

            const ws = new WebSocket(wsUpdatesUrl, this.protocol)

            ws.onopen = () => {
                ws.send(JSON.stringify(request))
            }
            ws.onmessage = (event) => {
                messageQueue.push(JSON.parse(event.data as string))
                this.logger.debug(event.data, `Received event`)
                resolveNext?.()
            }
            ws.onerror = () => {
                streamError = new Error('WebSocket Handshake/Connection failed')
                this.logger.error(`Encountered ws.onError`)
                isClosed = true
                resolveNext?.()
            }
            ws.onclose = (event: CloseEvent) => {
                this.logger.debug(
                    `CLOSING WEBSOCKET CONNECTION code: ${event.code}, reason: ${event.reason}`
                )
                isClosed = true
                resolveNext?.()
            }

            try {
                while (true) {
                    if (messageQueue.length === 0) {
                        if (isClosed) break
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
                this.logger.info('Generator cleanup: WebSocket closed.')
            }
        }

        return generator.call(this)
    }
}
