// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    buildController,
    PartyMode,
    type SigningDriverInterface,
    SigningProvider,
    type SignMessageResult,
} from '@canton-network/core-signing-lib'

import type {
    SignTransactionParams,
    SignTransactionResult,
    SignMessageParams,
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
import {
    DfnsHandler,
    type DfnsCredentials,
    type DfnsSignature,
} from './dfns.js'
import type { AuthContext } from '@canton-network/core-wallet-auth'
import _ from 'lodash'
import { z } from 'zod'

export type { DfnsCredentials, DfnsKey, DfnsSignature } from './dfns.js'
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
    baseUrl: z.url(),
    credentials: DfnsCredentialsSchema,
})

const createDfnsHandler = (config: DfnsConfig): DfnsHandler =>
    new DfnsHandler(config.orgId, config.baseUrl, config.credentials)

function toTransaction(sig: DfnsSignature, publicKey?: string): Transaction {
    const tx: Transaction = {
        txId: sig.id,
        status: sig.status,
    }
    if (sig.signature) tx.signature = sig.signature
    if (publicKey) tx.publicKey = publicKey
    return tx
}

export default class DfnsSigningDriver implements SigningDriverInterface {
    private dfns: DfnsHandler
    private config: DfnsConfig

    constructor(config: DfnsConfig) {
        this.config = config
        this.dfns = createDfnsHandler(config)
    }

    public partyMode = PartyMode.EXTERNAL
    public signingProvider = SigningProvider.DFNS

    private async resolveKeyId(keyIdentifier: {
        id?: string
        publicKey?: string
    }): Promise<string | undefined> {
        if (keyIdentifier.id) return keyIdentifier.id
        if (!keyIdentifier.publicKey) return undefined

        const key = await this.dfns.findKeyByPublicKey(keyIdentifier.publicKey)
        return key?.id
    }

    public controller = (_userId: AuthContext['userId'] | undefined) =>
        buildController({
            signTransaction: async (
                params: SignTransactionParams
            ): Promise<SignTransactionResult> => {
                try {
                    const keyId = await this.resolveKeyId(params.keyIdentifier)
                    if (!keyId) {
                        return {
                            error: 'key_not_found',
                            error_description:
                                'No Dfns key found for the provided key identifier.',
                        }
                    }

                    if (!params.txHash) {
                        return {
                            error: 'bad_arguments',
                            error_description:
                                'txHash is required to sign with Dfns.',
                        }
                    }

                    const sig = await this.dfns.signHash(
                        keyId,
                        params.txHash,
                        params.internalTxId
                    )

                    return toTransaction(sig, params.keyIdentifier.publicKey)
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
                    const sig = await this.dfns.findSignature(params.txId)
                    if (!sig) {
                        return {
                            error: 'transaction_not_found',
                            error_description:
                                'The requested signature does not exist.',
                        }
                    }
                    const key = await this.dfns.getKey(sig.keyId)
                    return toTransaction(sig, key?.publicKey)
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

                    for await (const key of this.dfns.iterateKeys()) {
                        if (
                            params.publicKeys &&
                            !publicKeys.has(key.publicKey)
                        ) {
                            continue
                        }

                        for await (const sig of this.dfns.listSignatures(
                            key.id
                        )) {
                            if (params.txIds && !txIds.has(sig.id)) continue
                            transactions.push(toTransaction(sig, key.publicKey))

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
                    const keys = await this.dfns.listKeys()
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
                    const key = await this.dfns.createKey(params.name)
                    return {
                        id: key.id,
                        name: key.name,
                        publicKey: key.publicKey,
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

            // TODO remove comment below and write a test once / if ever implemented
            // v8 ignore next -- @preserve
            subscribeTransactions: async (
                _params: SubscribeTransactionsParams
            ): Promise<SubscribeTransactionsResult> => {
                return Promise.resolve({} as SubscribeTransactionsResult)
            },
            signMessage: async (
                params: SignMessageParams
            ): Promise<SignMessageResult> => {
                try {
                    if (params.message.length === 0) {
                        return {
                            error: 'bad_arguments',
                            error_description:
                                'A non-empty message is required to sign with Dfns.',
                        }
                    }

                    const keyId = await this.resolveKeyId(params.keyIdentifier)
                    if (!keyId) {
                        return {
                            error: 'key_not_found',
                            error_description:
                                'No Dfns key found for the provided key identifier.',
                        }
                    }

                    const signingResult = await this.dfns.signMessage(
                        keyId,
                        params.message,
                        params.internalTxId
                    )
                    return {
                        txId: signingResult.id,
                        status: signingResult.status,
                        ...(signingResult.signature && {
                            signature: signingResult.signature,
                        }),
                    }
                } catch (error) {
                    return {
                        error: 'signing_error',
                        error_description: (error as Error).message,
                    }
                }
            },
        })
}
