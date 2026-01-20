// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Logger, pino } from 'pino'
import {
    LedgerClient,
    TokenStandardService,
    AmuletService,
} from '@canton-network/core-ledger-client'
import * as sdk from '@canton-network/dapp-sdk'
import { TokenStandardClient } from '@canton-network/core-token-standard'
import { ScanProxyClient } from '@canton-network/core-splice-client'
import { TransactionHistoryService } from './transaction-history-service'

// This module allows us to resolve (i.e. get an instance of) the different
// dependency services used throughout the project.

// NOTE(jaspervdj): many dApps will need something similar to this, so consider
// moving this into one of the core libraries.
const createLedgerClient = async (options: {
    logger: Logger
}): Promise<LedgerClient> => {
    // TODO: default level should not be debug.
    const logger =
        options.logger ?? pino({ name: 'LedgerClient', level: 'debug' })

    // The .invalid TLD is guaranteed to never resolve.  This helps us ensure
    // we don't accidentally send data somewhere we don't want to.
    const fakeHost = 'ledger.invalid'

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

        try {
            const response = await sdk.ledgerApi({
                requestMethod,
                resource,
                body,
            })

            return new Response(response.response)
        } catch (err: unknown) {
            // Mimic errors that come directly from the ledger API.
            // Catches in the codebase assume that e.g. 'err.code' is set.
            if (typeof err === 'object' && err !== null && 'error' in err) {
                const typedErr = err as { error?: { data?: unknown } }
                if (typeof typedErr.error?.data === 'object') {
                    throw typedErr.error.data
                } else if (typeof typedErr.error?.data === 'string') {
                    throw JSON.parse(typedErr.error.data).error.data
                }
            }

            throw err
        }
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
}: {
    logger: Logger
    ledgerClient: LedgerClient
}): Promise<TokenStandardService> => {
    const tokenStandardService = new TokenStandardService(
        ledgerClient,
        logger,
        undefined!, // access token provider
        false // isMasterUser
    )
    return tokenStandardService
}

const createAmuletService = async ({
    sessionToken,
    tokenStandardService,
}: {
    sessionToken: string
    tokenStandardService: TokenStandardService
}): Promise<AmuletService> => {
    const scanProxyClient = new ScanProxyClient(
        new URL('http://localhost:2000/api/validator'),
        logger,
        false, // isAdmin
        sessionToken
    )
    return new AmuletService(tokenStandardService, scanProxyClient, undefined)
}

// Global, but so is the dApp SDK.
const logger = pino({ name: 'example-portfolio', level: 'debug' })
const ledgerClient: { singleton: LedgerClient | undefined } = {
    singleton: undefined,
}
const tokenStandardClients = new Map()
const tokenStandardService: { singleton: TokenStandardService | undefined } = {
    singleton: undefined,
}
const amuletServices = new Map()
const transactionHistoryServices = new Map()

// Can be called to reset clients on disconnects.
export const clear = () => {
    ledgerClient.singleton = undefined
    tokenStandardClients.clear()
    tokenStandardService.singleton = undefined
    amuletServices.clear()
    transactionHistoryServices.clear()
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

export const resolveTokenStandardService =
    async (): Promise<TokenStandardService> => {
        if (!tokenStandardService.singleton) {
            const ledgerClient = await resolveLedgerClient()
            tokenStandardService.singleton = await createTokenStandardService({
                logger,
                ledgerClient,
            })
        }
        return tokenStandardService.singleton
    }

export const resolveAmuletService = async ({
    sessionToken, // todo: scan URLs?
}: {
    sessionToken: string
}): Promise<AmuletService> => {
    const key = sessionToken
    if (amuletServices.has(key)) return amuletServices.get(key)
    const tokenStandardService = await resolveTokenStandardService()
    const amuletService = await createAmuletService({
        sessionToken,
        tokenStandardService,
    })
    amuletServices.set(key, amuletService)
    return amuletService
}

export const resolveTransactionHistoryService = async ({
    party,
}: {
    party: string
}): Promise<TransactionHistoryService> => {
    const key = party
    if (transactionHistoryServices.has(key))
        return transactionHistoryServices.get(key)
    const ledgerClient = await resolveLedgerClient()
    const transactionHistoryService = new TransactionHistoryService({
        logger,
        ledgerClient,
        party,
    })
    transactionHistoryServices.set(key, transactionHistoryService)
    return transactionHistoryService
}
