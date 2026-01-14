// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    Key,
    Transaction,
    SignTransactionParams,
    GetTransactionParams,
    GetTransactionsParams,
    CreateKeyParams,
    Tx,
    TxHash,
    KeyIdentifier,
    InternalTxId,
    PublicKey,
} from '@canton-network/core-signing-lib'

/**
 * A TypeScript SDK client for the Wallet Signing API.
 */
export class SigningAPIClient {
    private baseUrl: string
    private apiKey: string | undefined
    private masterKey: string
    private testNetwork: boolean

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
        this.masterKey = 'Default'
        this.testNetwork = true
    }

    private async post<I extends Record<string, unknown>, O>(
        endpoint: string,
        params: I
    ): Promise<O> {
        const url = `${this.baseUrl}${endpoint}`

        // Merge context params (masterKey and testNetwork) into the request body
        const bodyToSend = {
            ...params,
            masterKey: this.masterKey,
            testNetwork: this.testNetwork,
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`
        }

        console.log(
            'blockdeamon request to:',
            url,
            'with body:',
            JSON.stringify(bodyToSend)
        )
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(bodyToSend),
        })

        console.log('blockdeamon response status:', response.status)
        if (!response.ok) {
            const errorText = await response.text()
            console.log('blockdeamon response error text:', errorText)
            throw new Error(
                `API call to ${endpoint} failed (${response.status}): ${errorText}`
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
        console.log('blockdeamon signTransaction called with params')
        return this.post<BlockDaemonSignTransactionParams, Transaction>(
            '/signTransaction',
            {
                publicKey: params.keyIdentifier.publicKey!,
                ...params,
            }
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
     * Returns the current BaseURL, ApiKey, MasterKey, and TestNetwork settings.
     */
    public getConfiguration(): Record<string, unknown> {
        return {
            BaseURL: this.baseUrl,
            ApiKey: this.apiKey,
            MasterKey: this.masterKey,
            TestNetwork: this.testNetwork,
        }
    }

    /**
     * Set configuration parameters (client-side only).
     * Updates only the provided configuration fields.
     * @param params - Configuration parameters to set. All fields are optional.
     */
    public setConfiguration(params: {
        BaseURL?: string
        ApiKey?: string
        MasterKey?: string
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
        if (params.TestNetwork !== undefined) {
            this.testNetwork = params.TestNetwork
        }
        return this.getConfiguration()
    }
}

//todo: remove once blockdaemon supports keyIdentifier instead of publicKey
interface BlockDaemonSignTransactionParams {
    tx: Tx
    txHash: TxHash
    publicKey: PublicKey
    keyIdentifier: KeyIdentifier
    internalTxId?: InternalTxId
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    [k: string]: any
}
