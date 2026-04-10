// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    Key,
    Transaction,
    SignTransactionParams,
    GetTransactionParams,
    GetTransactionsParams,
    CreateKeyParams,
} from '@canton-network/core-signing-lib'

/**
 * A TypeScript SDK client for the Wallet Signing API.
 */
export class SigningAPIClient {
    private baseUrl: string
    private apiKey: string | undefined
    private masterKey: string
    private caip2: string

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
        this.masterKey = 'Default'
        this.caip2 = 'canton:devnet'
    }

    private async post<I extends Record<string, unknown>, O>(
        endpoint: string,
        params: I
    ): Promise<O> {
        const url = `${this.baseUrl}${endpoint}`
        // Merge context params (masterKey and caip2) into the request body
        const bodyToSend = {
            ...params,
            masterKey: this.masterKey,
            caip2: this.caip2,
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(bodyToSend),
        })

        if (!response.ok) {
            const errorText = await response.text()
            throw new Error(
                `API call to ${endpoint} failed (${response.status}): ${errorText || response.statusText}`
            )
        }

        // Handle 204 No Content for methods that return empty objects or null/void
        if (
            response.status === 204 ||
            response.headers.get('content-length') === '0'
        ) {
            // SetConfiguration/GetConfiguration return map[string]any which might be empty
            return {} as O
        }

        return response.json() as Promise<O>
    }

    /**
     * Uses the Wallet Provider to sign a transaction.
     * @param params - The transaction signing parameters.
     */
    public async signTransaction(
        params: SignTransactionParams
    ): Promise<Transaction> {
        return this.post<SignTransactionParams, Transaction>(
            '/signTransaction',
            params
        )
    }

    /**
     * Get the status of a single transaction by its ID.
     * @param params - The transaction ID parameters.
     */
    public async getTransaction(
        params: GetTransactionParams
    ): Promise<Transaction> {
        return this.post<GetTransactionParams, Transaction>(
            '/getTransaction',
            params
        )
    }

    /**
     * Get the status of multiple transactions.
     * @param params - Filters for transactions.
     */
    public async getTransactions(
        params: GetTransactionsParams
    ): Promise<Transaction[]> {
        // Note: The Go handler returns []Transaction, the HTTP handler wraps it in JSON array.
        return this.post<GetTransactionsParams, Transaction[]>(
            '/getTransactions',
            params
        )
    }

    /**
     * Get a list of public keys available for signing.
     */
    public async getKeys(): Promise<Key[]> {
        // Go's addDummyArg is used for no-arg handlers, so we send an empty body.
        return this.post<Record<string, never>, Key[]>('/getKeys', {})
    }

    /**
     * Create a new key at the Wallet Provider.
     * @param params - The key creation parameters.
     */
    public async createKey(params: CreateKeyParams): Promise<Key> {
        return this.post<CreateKeyParams, Key>('/createKey', params)
    }

    /**
     * Get configuration parameters (client-side only).
     * Returns the current BaseURL, ApiKey, MasterKey, and CAIP2 settings.
     */
    public getConfiguration(): Record<string, unknown> {
        return {
            BaseURL: this.baseUrl,
            ApiKey: this.apiKey,
            MasterKey: this.masterKey,
            CAIP2: this.caip2,
        }
    }

    /**
     * Set configuration parameters (client-side only).
     * Updates only the provided configuration fields.
     *
     * If `Caip2` is provided, it is used directly. When `TestNetwork` is also
     * provided, the two must agree: `canton:devnet` and `canton:testnet` are
     * considered test networks, `canton:mainnet` is not.
     *
     * If only `TestNetwork` is provided (without `Caip2`), it is mapped to a
     * CAIP2 string: `true` -> `canton:devnet`, `false` -> `canton:mainnet`.
     *
     * @param params - Configuration parameters to set. All fields are optional.
     */
    public setConfiguration(params: {
        BaseURL?: string
        ApiKey?: string
        MasterKey?: string
        /** CAIP2 chain identifier (e.g. `canton:devnet`, `canton:mainnet`). */
        Caip2?: string
        /** @deprecated Use `Caip2` instead. */
        TestNetwork?: boolean
    }): Record<string, unknown> {
        if (params.BaseURL !== undefined) {
            this.baseUrl = params.BaseURL.endsWith('/')
                ? params.BaseURL.slice(0, -1)
                : params.BaseURL
        }
        if (params.ApiKey !== undefined) {
            this.apiKey = params.ApiKey
        }
        if (params.MasterKey !== undefined) {
            this.masterKey = params.MasterKey
        }
        if (
            params.Caip2 !== undefined &&
            params.TestNetwork !== undefined &&
            (params.Caip2 === 'canton:devnet' ||
                params.Caip2 === 'canton:testnet') !== params.TestNetwork
        ) {
            throw new Error(
                `Caip2 "${params.Caip2}" and TestNetwork=${params.TestNetwork} are inconsistent`
            )
        }
        if (params.Caip2 !== undefined) {
            this.caip2 = params.Caip2
        } else if (params.TestNetwork !== undefined) {
            this.caip2 = params.TestNetwork ? 'canton:devnet' : 'canton:mainnet'
        }
        return this.getConfiguration()
    }
}
