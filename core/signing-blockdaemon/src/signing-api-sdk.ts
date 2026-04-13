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

export type CantonCaip2 = 'canton:devnet' | 'canton:testnet' | 'canton:mainnet'

/**
 * A TypeScript SDK client for the Wallet Signing API.
 */
export class SigningAPIClient {
    private baseUrl: string
    private apiKey: string | undefined
    private masterKey: string
    private caip2: CantonCaip2

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
        this.masterKey = 'Default'
        this.caip2 = 'canton:devnet'
    }

    private async post<I extends Record<string, unknown>, O>(
        endpoint: string,
        params: I,
        caip2?: CantonCaip2
    ): Promise<O> {
        const url = `${this.baseUrl}${endpoint}`
        const bodyToSend = {
            ...params,
            masterKey: this.masterKey,
            caip2: caip2 ?? this.caip2,
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
        params: SignTransactionParams,
        caip2?: CantonCaip2
    ): Promise<Transaction> {
        return this.post<SignTransactionParams, Transaction>(
            '/signTransaction',
            params,
            caip2
        )
    }

    /**
     * Get the status of a single transaction by its ID.
     * @param params - The transaction ID parameters.
     */
    public async getTransaction(
        params: GetTransactionParams,
        caip2?: CantonCaip2
    ): Promise<Transaction> {
        return this.post<GetTransactionParams, Transaction>(
            '/getTransaction',
            params,
            caip2
        )
    }

    /**
     * Get the status of multiple transactions.
     * @param params - Filters for transactions.
     */
    public async getTransactions(
        params: GetTransactionsParams,
        caip2?: CantonCaip2
    ): Promise<Transaction[]> {
        return this.post<GetTransactionsParams, Transaction[]>(
            '/getTransactions',
            params,
            caip2
        )
    }

    /**
     * Get a list of public keys available for signing.
     */
    public async getKeys(caip2?: CantonCaip2): Promise<Key[]> {
        return this.post<Record<string, never>, Key[]>('/getKeys', {}, caip2)
    }

    /**
     * Create a new key at the Wallet Provider.
     * @param params - The key creation parameters.
     */
    public async createKey(
        params: CreateKeyParams,
        caip2?: CantonCaip2
    ): Promise<Key> {
        return this.post<CreateKeyParams, Key>('/createKey', params, caip2)
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
     * @param params - Configuration parameters to set. All fields are optional.
     */
    public setConfiguration(params: {
        BaseURL?: string
        ApiKey?: string
        MasterKey?: string
        Caip2?: CantonCaip2
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
        if (params.Caip2 !== undefined) {
            this.caip2 = params.Caip2
        }
        return this.getConfiguration()
    }
}
