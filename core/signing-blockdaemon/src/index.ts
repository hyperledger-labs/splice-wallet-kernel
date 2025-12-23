// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    buildController,
    type CreateKeyParams,
    type CreateKeyResult,
    type GetConfigurationResult,
    type GetKeysResult,
    type GetTransactionParams,
    type GetTransactionResult,
    type GetTransactionsParams,
    type GetTransactionsResult,
    PartyMode,
    type SetConfigurationParams,
    type SetConfigurationResult,
    type SigningDriverInterface,
    SigningProvider,
    type SignTransactionParams,
    type SignTransactionResult,
    type SubscribeTransactionsParams,
    type SubscribeTransactionsResult,
} from '@canton-network/core-signing-lib'
import { AuthContext } from '@canton-network/core-wallet-auth'
import { SigningAPIClient } from './signing-api-sdk.js'

export { SigningAPIClient } from './signing-api-sdk.js'

export interface BlockdaemonConfig {
    baseUrl: string
    apiKey: string
}

export default class BlockdaemonSigningDriver implements SigningDriverInterface {
    private client: SigningAPIClient

    constructor(config: BlockdaemonConfig) {
        this.client = new SigningAPIClient(config.baseUrl)
        this.client.setConfiguration({ ApiKey: config.apiKey })
    }

    public partyMode = PartyMode.EXTERNAL
    public signingProvider = SigningProvider.BLOCKDAEMON

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public controller = (_userId: AuthContext['userId'] | undefined) =>
        buildController({
            signTransaction: async (
                params: SignTransactionParams
            ): Promise<SignTransactionResult> => {
                try {
                    const tx = await this.client.signTransaction({
                        tx: params.tx,
                        txHash: params.txHash,
                        publicKey: params.publicKey,
                        internalTxId: params.internalTxId,
                    })
                    return {
                        txId: tx.txId,
                        status: tx.status,
                        signature: tx.signature,
                        publicKey: tx.publicKey,
                    }
                } catch (error) {
                    return {
                        error: 'signing_error',
                        error_description: (error as Error).message,
                    }
                }
            },

            getTransaction: async (
                params: GetTransactionParams
            ): Promise<GetTransactionResult> => {
                try {
                    const tx = await this.client.getTransaction({
                        txId: params.txId,
                    })
                    return {
                        txId: tx.txId,
                        status: tx.status,
                        signature: tx.signature,
                        publicKey: tx.publicKey,
                    }
                } catch (error) {
                    return {
                        error: 'transaction_not_found',
                        error_description: (error as Error).message,
                    }
                }
            },

            getTransactions: async (
                params: GetTransactionsParams
            ): Promise<GetTransactionsResult> => {
                if (params.publicKeys || params.txIds) {
                    try {
                        const transactions = await this.client.getTransactions({
                            txIds: params.txIds,
                            publicKeys: params.publicKeys,
                        })
                        return {
                            transactions: transactions.map((tx) => ({
                                txId: tx.txId,
                                status: tx.status,
                                signature: tx.signature,
                                publicKey: tx.publicKey,
                            })),
                        }
                    } catch (error) {
                        return {
                            error: 'fetch_error',
                            error_description: (error as Error).message,
                        }
                    }
                } else {
                    return {
                        error: 'bad_arguments',
                        error_description:
                            'either public key or txIds must be supplied',
                    }
                }
            },

            getKeys: async (): Promise<GetKeysResult> => {
                try {
                    const keys = await this.client.getKeys()
                    return {
                        keys: keys.map((k) => ({
                            id: k.id,
                            name: k.name,
                            publicKey: k.publicKey,
                        })),
                    }
                } catch (error) {
                    return {
                        error: 'fetch_error',
                        error_description: (error as Error).message,
                    }
                }
            },

            createKey: async (
                params: CreateKeyParams
            ): Promise<CreateKeyResult> => {
                try {
                    const key = await this.client.createKey({
                        name: params.name,
                    })
                    return {
                        id: key.id,
                        name: key.name,
                        publicKey: key.publicKey,
                    }
                } catch (error) {
                    return {
                        error: 'create_key_error',
                        error_description: (error as Error).message,
                    }
                }
            },

            getConfiguration: async (): Promise<GetConfigurationResult> => {
                const config = this.client.getConfiguration()
                return {
                    ...config,
                    ApiKey: config.ApiKey ? '***HIDDEN***' : undefined,
                    MasterKey: config.MasterKey ? '***HIDDEN***' : undefined,
                }
            },

            setConfiguration: async (
                params: SetConfigurationParams
            ): Promise<SetConfigurationResult> => {
                this.client.setConfiguration({
                    BaseURL: params['BaseURL'] as string | undefined,
                    ApiKey: params['ApiKey'] as string | undefined,
                    MasterKey: params['MasterKey'] as string | undefined,
                    TestNetwork: params['TestNetwork'] as boolean | undefined,
                })
                return params
            },

            subscribeTransactions: async (
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                _params: SubscribeTransactionsParams
            ): Promise<SubscribeTransactionsResult> =>
                Promise.resolve({} as SubscribeTransactionsResult),
        })
}
