// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Disabled unused vars rule to allow for future implementations
/* oxlint-disable no-unused-vars */
import {
    buildController,
    PartyMode,
    type SigningDriverInterface,
    SigningProvider,
    type SignMessageResult,
} from '@canton-network/core-signing-lib'

import type {
    SignMessageParams,
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
import type { FireblocksApiKeyInfo } from './fireblocks.js'
import { FireblocksHandler } from './fireblocks.js'
import _ from 'lodash'
import { z } from 'zod'
import type { AuthContext } from '@canton-network/core-wallet-auth'

export interface FireblocksConfig {
    defaultKeyInfo?: FireblocksApiKeyInfo
    userApiKeys: Map<string, FireblocksApiKeyInfo>
    apiPath?: string
    coinType?: number
}

const FireblocksApiKeyInfoSchema = z.object({
    apiKey: z.string(),
    apiSecret: z.string(),
})

const FireblocksConfigSchema = z.object({
    defaultApiKey: FireblocksApiKeyInfoSchema.optional(),
    userApiKeys: z.map(z.string(), FireblocksApiKeyInfoSchema),
    apiPath: z.string().optional(),
    coinType: z.number().optional(),
})

const createFireblocksHandler = (
    config: FireblocksConfig
): FireblocksHandler => {
    return new FireblocksHandler(
        config.defaultKeyInfo
            ? {
                  apiKey: config.defaultKeyInfo.apiKey,
                  apiSecret: config.defaultKeyInfo.apiSecret,
              }
            : undefined,
        config.userApiKeys,
        config.apiPath || 'https://api.fireblocks.io/v1',
        config.coinType
    )
}

function toBase64(hexString: string): string
function toBase64(hexString?: string): string | undefined
function toBase64(hexString?: string): string | undefined {
    return hexString && Buffer.from(hexString, 'hex').toString('base64')
}

function toHex(base64String: string): string
function toHex(base64String?: string): string | undefined
function toHex(base64String?: string): string | undefined {
    return base64String && Buffer.from(base64String, 'base64').toString('hex')
}

export default class FireblocksSigningDriver implements SigningDriverInterface {
    private fireblocks: FireblocksHandler
    private config: FireblocksConfig

    constructor(config: FireblocksConfig) {
        this.config = config
        this.fireblocks = createFireblocksHandler(config)
    }
    public partyMode = PartyMode.EXTERNAL
    public signingProvider = SigningProvider.FIREBLOCKS
    public controller = (userId: AuthContext['userId'] | undefined) =>
        buildController({
            signTransaction: async (
                params: SignTransactionParams
            ): Promise<SignTransactionResult> => {
                // TODO: validate transaction here

                try {
                    const hexKeyIdentifier = params.keyIdentifier.publicKey
                        ? {
                              publicKey: toHex(params.keyIdentifier.publicKey),
                          }
                        : params.keyIdentifier

                    const tx = await this.fireblocks.signTransaction(
                        userId,
                        toHex(params.txHash),
                        hexKeyIdentifier,
                        `Signing transaction with public key ${hexKeyIdentifier.publicKey}`,
                        params.internalTxId
                    )

                    return {
                        txId: tx.txId,
                        status: tx.status,
                        signature: toBase64(tx.signature),
                        publicKey: toBase64(tx.publicKey),
                    }
                } catch (error) {
                    return {
                        error: 'signing_error',
                        error_description: (error as Error).message,
                    }
                }
            },

            signMessage: async (
                params: SignMessageParams
            ): Promise<SignMessageResult> => {
                try {
                    if (params.message.length === 0) {
                        return {
                            error: 'bad_arguments',
                            error_description:
                                'A non-empty message is required to sign with Fireblocks.',
                        }
                    }
                    if (!params.keyIdentifier?.publicKey) {
                        return {
                            error: 'key_not_found',
                            error_description:
                                'The provided key identifier must include a publicKey.',
                        }
                    }

                    const messageHex = Buffer.from(
                        params.message,
                        'utf8'
                    ).toString('hex')
                    const publicKey = toHex(params.keyIdentifier.publicKey)
                    const tx = await this.fireblocks.signTransaction(
                        userId,
                        messageHex,
                        { publicKey },
                        `Signing message with public key ${publicKey}`,
                        params.internalTxId
                    )

                    return {
                        txId: tx.txId,
                        status: tx.status,
                        ...(tx.signature
                            ? { signature: toBase64(tx.signature) }
                            : {}),
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
                const tx = await this.fireblocks.getTransaction(
                    userId,
                    params.txId
                )
                if (tx) {
                    return {
                        txId: tx.txId,
                        status: tx.status,
                        signature: toBase64(tx.signature),
                        publicKey: toBase64(tx.publicKey),
                    } as GetTransactionResult
                } else {
                    return {
                        error: 'transaction_not_found',
                        error_description:
                            'The requested transaction does not exist.',
                    }
                }
            },

            getTransactions: async (
                params: GetTransactionsParams
            ): Promise<GetTransactionsResult> => {
                const transactions: Transaction[] = []
                if (params.publicKeys || params.txIds) {
                    const txIds = new Set(params.txIds)
                    const publicKeys = new Set(params.publicKeys)
                    for await (const tx of this.fireblocks.getTransactions(
                        userId
                    )) {
                        if (
                            txIds.has(tx.txId) ||
                            publicKeys.has(tx.publicKey || '')
                        ) {
                            transactions.push({
                                txId: tx.txId,
                                status: tx.status,
                                signature: toBase64(tx.signature),
                                publicKey: toBase64(tx.publicKey),
                            })
                        }
                        if (
                            params.txIds &&
                            !params.publicKeys &&
                            transactions.length == txIds.size
                        ) {
                            // stop if we are filtering by only txIds and have found all requested transactions
                            break
                        }
                    }
                    return {
                        transactions: transactions,
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
                    const keys = await this.fireblocks.getPublicKeys(userId)
                    return {
                        keys: keys.map((k) => ({
                            id: k.derivationPath.join('-'),
                            name: k.name,
                            publicKey: toBase64(k.publicKey),
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
                _params: CreateKeyParams
            ): Promise<CreateKeyResult> => {
                return {
                    error: 'not_allowed',
                    error_description:
                        'Creating a Fireblocks key through the Wallet Gateway is not allowed, please create new keys directly in Fireblocks.',
                }
            },

            getConfiguration: async (): Promise<GetConfigurationResult> => {
                const hideFireblocksKeySecret = (
                    keyInfo: FireblocksApiKeyInfo | undefined
                ): FireblocksApiKeyInfo | undefined => {
                    return keyInfo
                        ? {
                              apiKey: keyInfo.apiKey,
                              apiSecret: '***HIDDEN***',
                          }
                        : undefined
                }

                return {
                    ...this.config,
                    defaultKeyInfo: hideFireblocksKeySecret(
                        this.config.defaultKeyInfo
                    ),
                    userApiKeys: new Map(
                        [...this.config.userApiKeys].map(([k, v]) => [
                            k,
                            hideFireblocksKeySecret(v),
                        ])
                    ),
                }
            },

            setConfiguration: async (
                params: SetConfigurationParams
            ): Promise<SetConfigurationResult> => {
                const validated = FireblocksConfigSchema.safeParse(params)
                if (!validated.success) {
                    return {
                        error: 'bad_arguments',
                        error_description: validated.error.message,
                    }
                }
                if (!_.isEqual(validated.data, this.config)) {
                    this.config = validated.data
                    this.fireblocks = createFireblocksHandler(this.config)
                }
                return params
            },

            // TODO: implement subscribeTransactions - we will need to figure out how to handle subscriptions
            //  when the controller is not running in a server context
            // v8 ignore next -- @preserve
            subscribeTransactions: async (
                params: SubscribeTransactionsParams
            ): Promise<SubscribeTransactionsResult> =>
                Promise.resolve({} as SubscribeTransactionsResult),
        })
}
