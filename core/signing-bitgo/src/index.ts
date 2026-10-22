// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
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
    type SignMessageResult,
    type SignTransactionParams,
    type SignTransactionResult,
    type SubscribeTransactionsParams,
    type SubscribeTransactionsResult,
    type Transaction,
} from '@canton-network/core-signing-lib'
import type { AuthContext } from '@canton-network/core-wallet-auth'
import { z } from 'zod'
import { BitGoHandler, type BitGoConfig } from './bitgo.js'

const BitGoConfigUpdateSchema = z.object({
    accessToken: z.string().min(1).optional(),
    baseUrl: z.url().optional(),
    enterpriseId: z.string().min(1).optional(),
    coin: z.string().min(1).optional(),
})

export { BitGoHandler, type BitGoConfig } from './bitgo.js'

export default class BitGoSigningDriver implements SigningDriverInterface {
    private handler: BitGoHandler
    private config: BitGoConfig

    constructor(config: BitGoConfig) {
        this.config = config
        this.handler = new BitGoHandler(config)
    }

    public partyMode = PartyMode.EXTERNAL
    public signingProvider = SigningProvider.BITGO

    public controller = (_userId: AuthContext['userId'] | undefined) =>
        buildController({
            signTransaction: async (
                params: SignTransactionParams
            ): Promise<SignTransactionResult> => {
                try {
                    // id is the BitGo walletId (preferred); fall back to keyMap lookup by publicKey.
                    let walletId =
                        params.keyIdentifier.id ??
                        this.handler.getWalletId(params.keyIdentifier.publicKey)
                    if (!walletId && params.keyIdentifier.publicKey) {
                        // keyMap may be empty after a restart — refresh once and retry.
                        await this.handler.getKeys()
                        walletId = this.handler.getWalletId(
                            params.keyIdentifier.publicKey
                        )
                    }
                    if (!walletId) {
                        return {
                            error: 'key_not_found',
                            error_description:
                                'Could not resolve a BitGo walletId from the provided keyIdentifier. Pass keyIdentifier.id (walletId) directly, or keyIdentifier.publicKey (Ed25519 base64) so the driver can look it up via keyMap.',
                        }
                    }
                    const result = await this.handler.signTransaction({
                        tx: params.tx,
                        txHash: params.txHash,
                        walletId,
                        messageStandardType: params.extraParams
                            ?.messageStandardType as string | undefined,
                    })
                    return {
                        txId: result.txId,
                        status: 'pending',
                    }
                } catch (error) {
                    return {
                        error: 'signing_error',
                        error_description: (error as Error).message,
                    }
                }
            },

            // v8 ignore next -- @preserve
            signMessage: async (): Promise<SignMessageResult> => ({
                error: 'not_allowed',
                error_description:
                    'Signing messages is not supported with BitGo.',
            }),

            getTransaction: async (
                params: GetTransactionParams
            ): Promise<GetTransactionResult> => {
                try {
                    const tx = await this.handler.getTransaction(params.txId)
                    if (!tx) {
                        return {
                            error: 'transaction_not_found',
                            error_description: `No BitGo transaction found for txId: ${params.txId}`,
                        }
                    }
                    return {
                        txId: tx.txId,
                        status: tx.status,
                        ...(tx.signature !== undefined && {
                            signature: tx.signature,
                        }),
                        ...(tx.publicKey !== undefined && {
                            publicKey: tx.publicKey,
                        }),
                        ...(tx.metadata !== undefined && {
                            metadata: tx.metadata,
                        }),
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
                if (!params.txIds?.length && !params.publicKeys?.length) {
                    return {
                        error: 'bad_arguments',
                        error_description:
                            'Either txIds or publicKeys must be supplied.',
                    }
                }
                try {
                    const transactions: Transaction[] = []
                    const txIdSet = new Set(params.txIds ?? [])
                    const seen = new Set<string>()
                    for await (const tx of this.handler.getTransactions({
                        txIds: params.txIds,
                        publicKeys: params.publicKeys,
                    })) {
                        if (seen.has(tx.txId)) continue
                        seen.add(tx.txId)
                        transactions.push({
                            txId: tx.txId,
                            status: tx.status,
                            ...(tx.signature !== undefined && {
                                signature: tx.signature,
                            }),
                            ...(tx.publicKey !== undefined && {
                                publicKey: tx.publicKey,
                            }),
                            ...(tx.metadata !== undefined && {
                                metadata: tx.metadata,
                            }),
                        })
                        // break early when filtering by txIds only and all have been found
                        if (
                            params.txIds &&
                            !params.publicKeys &&
                            transactions.length === txIdSet.size
                        ) {
                            break
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
                    const keys = await this.handler.getKeys()
                    return { keys }
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
                    const key = await this.handler.createKey(params.name)
                    return key
                } catch (error) {
                    return {
                        error: 'create_key_error',
                        error_description: (error as Error).message,
                    }
                }
            },

            getConfiguration: async (): Promise<GetConfigurationResult> => ({
                baseUrl: this.config.baseUrl ?? 'https://app.bitgo.com',
                enterpriseId: this.config.enterpriseId,
                coin: this.config.coin,
                accessToken: '***HIDDEN***',
            }),

            setConfiguration: async (
                params: SetConfigurationParams
            ): Promise<SetConfigurationResult> => {
                const validated = BitGoConfigUpdateSchema.safeParse(params)
                if (!validated.success) {
                    return {
                        error: 'bad_arguments',
                        error_description: validated.error.message,
                    }
                }
                // Filter out undefined values so a partial update doesn't overwrite
                // existing config fields with undefined.
                const updates = Object.fromEntries(
                    Object.entries(validated.data).filter(
                        ([, v]) => v !== undefined
                    )
                ) as Partial<BitGoConfig>
                this.config = { ...this.config, ...updates }
                this.handler = new BitGoHandler(this.config)
                return params
            },

            // TODO: implement once / if subscribeTransactions is required
            // v8 ignore next -- @preserve
            subscribeTransactions: async (
                _params: SubscribeTransactionsParams
            ): Promise<SubscribeTransactionsResult> =>
                Promise.resolve({} as SubscribeTransactionsResult),
        })
}
