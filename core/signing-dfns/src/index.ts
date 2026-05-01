// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    buildController,
    PartyMode,
    SigningDriverInterface,
    SigningProvider,
} from '@canton-network/core-signing-lib'

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
    SubscribeTransactionsParams,
    SubscribeTransactionsResult,
    SetConfigurationResult,
    Transaction,
} from '@canton-network/core-signing-lib'
import { DfnsHandler, DfnsCredentials } from './dfns.js'
import { AuthContext } from '@canton-network/core-wallet-auth'
import _ from 'lodash'
import { z } from 'zod'

export type { DfnsCredentials } from './dfns.js'
export { DfnsHandler } from './dfns.js'

export interface DfnsConfig {
    orgId: string
    baseUrl: string
    credentials: DfnsCredentials
}

const DfnsCredentialsSchema = z.object({
    credId: z.string().min(1),
    privateKey: z.string().min(1),
    authToken: z.string().min(1),
})

const DfnsConfigSchema = z.object({
    orgId: z.string().min(1),
    baseUrl: z.string().url(),
    credentials: DfnsCredentialsSchema,
})

const createDfnsHandler = (config: DfnsConfig): DfnsHandler =>
    new DfnsHandler(config.orgId, config.baseUrl, config.credentials)

export default class DfnsSigningDriver implements SigningDriverInterface {
    private dfns: DfnsHandler
    private config: DfnsConfig

    constructor(config: DfnsConfig) {
        this.config = config
        this.dfns = createDfnsHandler(config)
    }

    public partyMode = PartyMode.EXTERNAL
    public signingProvider = SigningProvider.DFNS

    private async resolveWalletId(keyIdentifier: {
        id?: string
        publicKey?: string
    }): Promise<string | undefined> {
        if (keyIdentifier.id) return keyIdentifier.id
        if (!keyIdentifier.publicKey) return undefined

        for await (const wallet of this.dfns.iterateWallets()) {
            if (wallet.address === keyIdentifier.publicKey) {
                return wallet.id
            }
        }
        return undefined
    }

    public controller = (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _userId: AuthContext['userId'] | undefined
    ) =>
        buildController({
            signTransaction: async (
                params: SignTransactionParams
            ): Promise<SignTransactionResult> => {
                try {
                    const walletId = await this.resolveWalletId(
                        params.keyIdentifier
                    )
                    if (!walletId) {
                        return {
                            error: 'key_not_found',
                            error_description:
                                'No Dfns wallet found for the provided key identifier.',
                        }
                    }

                    // Dfns requires an idempotency key (externalId). Prefer the
                    // gateway-supplied internalTxId; fall back to the prepared
                    // transaction hash so retries are still idempotent.
                    const externalTxId = params.internalTxId ?? params.txHash
                    const tx = await this.dfns.signTransaction(
                        walletId,
                        params.tx,
                        externalTxId
                    )

                    const result: Transaction = {
                        txId: tx.txId,
                        status: tx.status,
                    }

                    if (tx.publicKey) {
                        result.publicKey = tx.publicKey
                    }

                    return result
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
                    for await (const wallet of this.dfns.iterateWallets()) {
                        const tx = await this.dfns.getTransaction(
                            wallet.id,
                            params.txId
                        )
                        if (tx) {
                            const result: Transaction = {
                                txId: tx.txId,
                                status: tx.status,
                                publicKey: wallet.address,
                            }
                            return result
                        }
                    }
                    return {
                        error: 'transaction_not_found',
                        error_description:
                            'The requested transaction does not exist.',
                    }
                } catch (error) {
                    return {
                        error: 'fetch_error',
                        error_description: (error as Error).message,
                    }
                }
            },

            getTransactions: async (
                params: GetTransactionsParams
            ): Promise<GetTransactionsResult> => {
                if (!params.publicKeys && !params.txIds) {
                    return {
                        error: 'bad_arguments',
                        error_description:
                            'Either publicKeys or txIds must be provided.',
                    }
                }

                try {
                    const txIds = new Set(params.txIds || [])
                    const publicKeys = new Set(params.publicKeys || [])
                    const transactions: Transaction[] = []

                    for await (const wallet of this.dfns.iterateWallets()) {
                        if (
                            params.publicKeys &&
                            !publicKeys.has(wallet.address)
                        ) {
                            continue
                        }

                        for await (const tx of this.dfns.listTransactions(
                            wallet.id
                        )) {
                            const matchesTxId = txIds.has(tx.txId)
                            const matchesPubKey = publicKeys.has(wallet.address)

                            if (
                                (params.txIds && !matchesTxId) ||
                                (params.publicKeys && !matchesPubKey)
                            ) {
                                continue
                            }

                            transactions.push({
                                txId: tx.txId,
                                status: tx.status,
                                publicKey: wallet.address,
                            })

                            if (
                                params.txIds &&
                                !params.publicKeys &&
                                transactions.length === txIds.size
                            ) {
                                return { transactions }
                            }
                        }
                    }

                    return { transactions }
                } catch (error) {
                    return {
                        error: 'fetch_error',
                        error_description: (error as Error).message,
                    }
                }
            },

            getKeys: async (): Promise<GetKeysResult> => {
                try {
                    const keys = await this.dfns.listWallets()
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
                    const wallet = await this.dfns.createWallet(params.name)
                    return {
                        id: wallet.id,
                        name: wallet.name,
                        publicKey: wallet.publicKey,
                    }
                } catch (error) {
                    return {
                        error: 'creation_error',
                        error_description: (error as Error).message,
                    }
                }
            },

            getConfiguration: async (): Promise<GetConfigurationResult> => ({
                orgId: this.config.orgId,
                baseUrl: this.config.baseUrl,
                credentials: this.config.credentials,
            }),

            setConfiguration: async (
                params: SetConfigurationParams
            ): Promise<SetConfigurationResult> => {
                const validated = DfnsConfigSchema.safeParse(params)
                if (!validated.success) {
                    return {
                        error: 'bad_arguments',
                        error_description: validated.error.message,
                    }
                }

                const newConfig: DfnsConfig = {
                    orgId: validated.data.orgId,
                    baseUrl: validated.data.baseUrl,
                    credentials: validated.data.credentials,
                }

                if (!_.isEqual(newConfig, this.config)) {
                    this.config = newConfig
                    this.dfns = createDfnsHandler(this.config)
                }

                return params
            },

            subscribeTransactions: async (
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                _params: SubscribeTransactionsParams
            ): Promise<SubscribeTransactionsResult> => {
                return Promise.resolve({} as SubscribeTransactionsResult)
            },
        })
}
