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
    type KeyIdentifier,
    PartyMode,
    type SetConfigurationParams,
    type SetConfigurationResult,
    type SigningDriverInterface,
    type SigningProvider,
    type SignMessageResult,
    type SignTransactionParams,
    type SignTransactionResult,
    type SubscribeTransactionsParams,
    type SubscribeTransactionsResult,
} from '@canton-network/core-signing-lib'
import type { AuthContext } from '@canton-network/core-wallet-auth'
import {
    keyLabelFromPublicKey,
    SigningAPIClient,
    type SecurosysTSBClientConfig,
    type TsbSignatureAlgorithm,
} from './signing-api-sdk.js'

export {
    keyLabelFromPublicKey,
    mapTsbStatus,
    normalizePublicKey,
    normalizeSignature,
    SigningAPIClient,
    type SecurosysTSBClientConfig,
    type TsbCreateKeyRequest,
    type TsbSignatureAlgorithm,
} from './signing-api-sdk.js'

export type SecurosysConfig = SecurosysTSBClientConfig

export const SECUROSYS_SIGNING_PROVIDER = 'securosys' as SigningProvider

export default class SecurosysSigningDriver implements SigningDriverInterface {
    private client: SigningAPIClient

    constructor(config: SecurosysConfig) {
        this.client = new SigningAPIClient(config)
    }

    public partyMode = PartyMode.EXTERNAL
    public signingProvider = SECUROSYS_SIGNING_PROVIDER

    public controller = (userId: AuthContext['userId'] | undefined) =>
        buildController({
            signTransaction: async (
                params: SignTransactionParams
            ): Promise<SignTransactionResult> => {
                try {
                    const keyIdentifier = withDerivedKeyLabel(
                        params.keyIdentifier
                    )
                    if (!keyIdentifier) {
                        return {
                            error: 'key_not_found',
                            error_description:
                                'The provided key identifier must include an id or publicKey.',
                        }
                    }

                    const tx = await this.client.signTransaction({
                        ...params,
                        keyIdentifier,
                        userIdentifier: userId,
                    })

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
                        error: 'signing_error',
                        error_description: (error as Error).message,
                    }
                }
            },

            signMessage: async (): Promise<SignMessageResult> => {
                return {
                    error: 'not_allowed',
                    error_description:
                        'Signing messages is not supported by the Securosys TSB signing driver.',
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
                                ...(tx.signature !== undefined && {
                                    signature: tx.signature,
                                }),
                                ...(tx.publicKey !== undefined && {
                                    publicKey: tx.publicKey,
                                }),
                                ...(tx.metadata !== undefined && {
                                    metadata: tx.metadata,
                                }),
                            })),
                        }
                    } catch (error) {
                        return {
                            error: 'fetch_error',
                            error_description: (error as Error).message,
                        }
                    }
                }

                return {
                    error: 'bad_arguments',
                    error_description:
                        'either public key or txIds must be supplied',
                }
            },

            getKeys: async (): Promise<GetKeysResult> => {
                try {
                    const keys = await this.client.getKeys()
                    return {
                        keys: keys.map((key) => ({
                            id: key.id,
                            name: key.name,
                            publicKey: key.publicKey,
                            userIdentifier: userId,
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
                        ...params,
                        userIdentifier: userId,
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
                return maskConfiguration(this.client.getConfiguration())
            },

            setConfiguration: async (
                params: SetConfigurationParams
            ): Promise<SetConfigurationResult> => {
                const config = this.client.setConfiguration({
                    BaseURL: params['BaseURL'] as string,
                    KeyManagementApiKey: params[
                        'KeyManagementApiKey'
                    ] as string,
                    KeyOperationApiKey: params['KeyOperationApiKey'] as string,
                    BearerToken: params['BearerToken'] as string,
                    MtlsP12Path: params['MtlsP12Path'] as string,
                    MtlsP12Password: params['MtlsP12Password'] as string,
                    KeyPassword: params['KeyPassword'] as string,
                    SignatureAlgorithm: params[
                        'SignatureAlgorithm'
                    ] as TsbSignatureAlgorithm,
                })
                return maskConfiguration(config)
            },

            subscribeTransactions: async (
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                _params: SubscribeTransactionsParams
            ): Promise<SubscribeTransactionsResult> =>
                Promise.resolve({} as SubscribeTransactionsResult),
        })
}

/**
 * Keys created by this driver are labelled from their public key, so derive
 * the label when the caller supplies only the public key. The public key is
 * kept so the client still verifies that the resolved key matches it.
 * Explicit ids are passed through unchanged.
 */
function withDerivedKeyLabel(
    keyIdentifier: KeyIdentifier
): KeyIdentifier | undefined {
    if (keyIdentifier.id !== undefined) {
        return keyIdentifier
    }
    if (keyIdentifier.publicKey === undefined) {
        return undefined
    }
    return {
        ...keyIdentifier,
        id: keyLabelFromPublicKey(keyIdentifier.publicKey),
    }
}

function maskConfiguration(
    config: Record<string, unknown>
): Record<string, unknown> {
    const sensitiveFields = new Set([
        'KeyManagementApiKey',
        'KeyOperationApiKey',
        'BearerToken',
        'MtlsP12Password',
        'KeyPassword',
    ])

    return Object.fromEntries(
        Object.entries(config).map(([key, value]) => [
            key,
            sensitiveFields.has(key) && value ? '***HIDDEN***' : value,
        ])
    )
}
