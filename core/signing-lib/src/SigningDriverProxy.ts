// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    SigningDriverInterface,
    SigningDriverStore,
    SigningKey,
    SigningTransaction,
    SigningDriverConfig,
    PartyMode,
    SigningProvider,
    Methods,
} from './index.js'
import {
    SignTransactionParams,
    SignTransactionResult,
    GetTransactionParams,
    GetTransactionResult,
    GetTransactionsResult,
    GetTransactionsParams,
    GetKeysResult,
    CreateKeyParams,
    CreateKeyResult,
    GetConfigurationResult,
    SetConfigurationParams,
    SetConfigurationResult,
    SubscribeTransactionsParams,
    SubscribeTransactionsResult,
    Transaction,
} from './rpc-gen/typings.js'

/**
 * Proxy that wraps a SigningDriverInterface and adds persistence capabilities.
 * Delegates calls to the underlying driver and stores results when appropriate.
 */
export class SigningDriverProxy implements SigningDriverInterface {
    private store: SigningDriverStore
    private driver: SigningDriverInterface
    private driverId: string

    constructor(
        driver: SigningDriverInterface,
        store: SigningDriverStore,
        driverId: string
    ) {
        this.driver = driver
        this.store = store
        this.driverId = driverId
    }

    public get partyMode(): PartyMode {
        return this.driver.partyMode
    }

    public get signingProvider(): SigningProvider {
        return this.driver.signingProvider
    }

    public controller = (userId: string | undefined | undefined) => {
        if (!userId) {
            throw new Error('User ID is required for all signing operations')
        }

        const originalController = this.driver.controller(userId)

        return {
            signTransaction: async (
                params: SignTransactionParams
            ): Promise<SignTransactionResult> => {
                const result = await originalController.signTransaction(params)

                // Store the transaction if signing was successful
                if (result.txId && result.status) {
                    const transaction: SigningTransaction = {
                        id: result.txId,
                        hash: params.txHash,
                        signature: result.signature,
                        publicKey: params.publicKey,
                        status: result.status,
                        metadata: {
                            driverId: this.driverId,
                            internalTxId: params.internalTxId,
                        },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }

                    await this.store.setSigningTransaction(userId, transaction)
                }

                return result
            },

            getTransaction: async (
                params: GetTransactionParams
            ): Promise<GetTransactionResult> => {
                // Check store first
                const storedTx = await this.store.getSigningTransaction(
                    userId,
                    params.txId
                )
                if (storedTx) {
                    return {
                        txId: storedTx.id,
                        status: storedTx.status,
                        ...(storedTx.signature !== undefined
                            ? { signature: storedTx.signature }
                            : {}),
                        publicKey: storedTx.publicKey,
                    }
                }

                // Fall back to driver
                const result = await originalController.getTransaction(params)

                // Store the result if found
                if (result.txId && result.status) {
                    const transaction: SigningTransaction = {
                        id: result.txId,
                        hash: '', // We don't have the original hash here
                        signature: result.signature,
                        publicKey: result.publicKey || '',
                        status: result.status,
                        metadata: {
                            driverId: this.driverId,
                            fetchedFromDriver: true,
                        },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }

                    await this.store.setSigningTransaction(userId, transaction)
                }

                return result
            },

            getTransactions: async (
                params: GetTransactionsParams
            ): Promise<GetTransactionsResult> => {
                // For now, delegate to driver and cache results
                // In a more sophisticated implementation, we could merge store and driver results
                const result = await originalController.getTransactions(params)

                // Cache transactions if we got them
                if (result.transactions && result.transactions.length > 0) {
                    const transactions: SigningTransaction[] =
                        result.transactions.map((tx: Transaction) => ({
                            id: tx.txId,
                            signature: tx.signature,
                            publicKey: tx.publicKey || '',
                            status: tx.status,
                            metadata: {
                                driverId: this.driverId,
                                cachedFromDriver: true,
                            },
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        }))

                    await this.store.setSigningTransactions(
                        userId,
                        transactions
                    )
                }

                return result
            },

            getKeys: async (): Promise<GetKeysResult> => {
                // Check store first
                const cachedKeys = await this.store.listSigningKeys(userId)
                if (cachedKeys.length > 0) {
                    return {
                        keys: cachedKeys.map((key) => ({
                            id: key.id,
                            name: key.name,
                            publicKey: key.publicKey,
                        })),
                    }
                }

                // Fetch from driver and cache
                const result = await originalController.getKeys()

                if (result.keys && result.keys.length > 0) {
                    const signingKeys: SigningKey[] = result.keys.map((key) => {
                        const signingKey: SigningKey = {
                            id: key.id,
                            name: key.name,
                            publicKey: key.publicKey,
                            metadata: {
                                driverId: this.driverId,
                                cachedFromDriver: true,
                            },
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        }
                        return signingKey
                    })

                    await this.store.setSigningKeys(userId, signingKeys)
                }

                return result
            },

            createKey: async (
                params: CreateKeyParams
            ): Promise<CreateKeyResult> => {
                const result = await originalController.createKey(params)
                // Store the key if creation was successful
                if (result.id && result.publicKey) {
                    const signingKey: SigningKey = {
                        id: result.id,
                        name: result.name,
                        publicKey: result.publicKey,
                        metadata: {
                            driverId: this.driverId,
                            createdByDriver: true,
                        },
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }
                    // Note: privateKey is optional and not set for external drivers like Fireblocks

                    await this.store.setSigningKey(userId, signingKey)
                }
                return result
            },

            getConfiguration: async (): Promise<GetConfigurationResult> => {
                // Check store first
                const storedConfig =
                    await this.store.getSigningDriverConfiguration(
                        userId,
                        this.driverId
                    )
                if (storedConfig) {
                    return storedConfig.config
                }

                // Fall back to driver
                return originalController.getConfiguration()
            },

            setConfiguration: async (
                params: SetConfigurationParams
            ): Promise<SetConfigurationResult> => {
                const result = await originalController.setConfiguration(params)

                // Store configuration if setting was successful
                if (!result.error) {
                    const driverConfig: SigningDriverConfig = {
                        driverId: this.driverId,
                        config: params,
                    }

                    await this.store.setSigningDriverConfiguration(
                        userId,
                        this.driverId,
                        driverConfig
                    )
                }

                return result
            },

            subscribeTransactions: async (
                params: SubscribeTransactionsParams
            ): Promise<SubscribeTransactionsResult> => {
                // For subscriptions, we just delegate to the driver
                // The driver handles the subscription logic
                return originalController.subscribeTransactions(params)
            },
        } as Methods
    }

    /**
     * Get the underlying driver (useful for testing or direct access)
     */
    public getUnderlyingDriver(): SigningDriverInterface {
        return this.driver
    }

    /**
     * Get the store instance (useful for testing or direct access)
     */
    public getStore(): SigningDriverStore {
        return this.store
    }
}
