// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Logger, pino } from 'pino'
import {
    LedgerClient,
    TokenStandardService,
} from '@canton-network/core-ledger-client'
import * as sdk from '@canton-network/dapp-sdk'
import { TokenStandardClient } from '@canton-network/core-token-standard'
import { ScanProxyClient } from '@canton-network/core-splice-client'

// NOTE(jaspervdj): many dApps will need something similar to this, so consider
// moving this into one of the core libraries.

const parseRequestMethod = (
    url: RequestInfo,
    options: RequestInit
): sdk.dappAPI.RequestMethod => {
    let method: string | undefined
    if (typeof url !== 'string') {
        method = url.method
    }
    if (options.method) {
        method = options.method
    }
    if (!method) return 'GET'
    method = method.toUpperCase()
    switch (method) {
        case 'POST':
            return 'POST'
        case 'GET':
            return 'GET'
        default:
            throw new Error(`Unknown method: ${method}`)
    }
}

const createLedgerClient = async (options: {
    logger: Logger
}): Promise<LedgerClient> => {
    // TODO: default level should not be debug.
    const logger =
        options.logger ?? pino({ name: 'LedgerClient', level: 'debug' })

    // The .invalid TLD is guaranteed to never resolve.  This helps us ensure
    // we don't accidentally send data somewhere we don't want to.
    const fakeHost = 'ledger.invalid'

    const customFetch = async (
        url: RequestInfo,
        options: RequestInit
    ): Promise<Response> => {
        // Parse method
        const requestMethod = parseRequestMethod(url, options)

        // Parse URL
        const parsedURL = new URL(typeof url === 'string' ? url : url.url)
        const resource = parsedURL.pathname
        if (parsedURL.host !== fakeHost) {
            throw new Error(
                `Unexpected host for dApp ledger client: ${parsedURL.host}`
            )
        }

        // Parse body
        let body: undefined | string
        if (typeof url !== 'string') {
            body = await url.text()
        }
        /*
        let bodyRepresentation = null
        console.log('url', url)
        console.log('options', options)
        if (options.body) {
            console.log('options.body', options.body)
            bodyRepresentation = options.body
        } else if (typeof url !== 'string') {
            console.log('url.body', url.text())
            if (url.bodyUsed) {
                throw new TypeError('Request body already used.')
            }
            bodyRepresentation = url.body
        }
        console.log('bodyRepresentation', typeof bodyRepresentation)
        if (typeof bodyRepresentation === 'string') {
            body = bodyRepresentation
        } else if (typeof bodyRepresentation === 'object') {
            console.log(bodyRepresentation)
        }
        */
        console.log('Sending body', body)

        const response = await sdk.ledgerApi({
            requestMethod,
            resource,
            body,
        })

        return new Response(response.response)
    }

    const ledgerClient = new LedgerClient({
        baseUrl: new URL('http://ledger.invalid'),
        logger,
        fetch: customFetch,
    })
    await ledgerClient.init() // Todo: remove?
    return ledgerClient
}

const createTokenStandardClient = async ({
    logger,
    registryUrl,
}: {
    logger: Logger
    registryUrl: string
}): Promise<TokenStandardClient> => {
    return new TokenStandardClient(
        registryUrl,
        logger,
        false // isAdmin
    )
}

const createTokenStandardService = async ({
    logger,
    ledgerClient,
    sessionToken,
}: {
    logger: Logger
    ledgerClient: LedgerClient
    sessionToken: string
}): Promise<{
    scanProxyClient: ScanProxyClient // TODO: remove
    tokenStandardService: TokenStandardService
}> => {
    const scanProxyClient = new ScanProxyClient(
        new URL('http://localhost:2000/api/validator'),
        logger,
        false, // isAdmin
        sessionToken
    )
    const tokenStandardService = new TokenStandardService(
        ledgerClient,
        scanProxyClient,
        logger,
        undefined!, // access token provider
        false, // isMasterUser
        undefined // scanClient
    )
    return {
        scanProxyClient,
        tokenStandardService,
    }
}

// Global, but so is the dApp SDK.
const logger = pino({ name: 'example-portfolio', level: 'debug' })
const ledgerClient: { singleton: LedgerClient | undefined } = {
    singleton: undefined,
}
const tokenStandardClients = new Map()
const tokenStandardServices = new Map()

// Can be called to reset clients on disconnects.
export const clear = () => {
    ledgerClient.singleton = undefined
    tokenStandardClients.clear()
    tokenStandardServices.clear()
}

export const resolveLedgerClient = async (): Promise<LedgerClient> => {
    if (!ledgerClient.singleton)
        ledgerClient.singleton = await createLedgerClient({ logger })
    return ledgerClient.singleton
}

export const resolveTokenStandardClient = async ({
    registryUrl,
}: {
    registryUrl: string
}): Promise<TokenStandardClient> => {
    const key = registryUrl
    if (tokenStandardClients.has(key)) return tokenStandardClients.get(key)
    const client = await createTokenStandardClient({ logger, registryUrl })
    tokenStandardClients.set(key, client)
    return client
}

export const resolveTokenStandardService = async ({
    sessionToken,
}: {
    sessionToken: string
}): Promise<TokenStandardService> => {
    const key = sessionToken
    if (tokenStandardServices.has(key)) return tokenStandardServices.get(key)
    const ledgerClient = await resolveLedgerClient()
    const { tokenStandardService } = await createTokenStandardService({
        logger,
        ledgerClient,
        sessionToken,
    })
    tokenStandardServices.set(key, tokenStandardService)
    return tokenStandardService
}
