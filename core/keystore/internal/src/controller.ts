// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import { buildController } from 'keystore-driver-library'
import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'

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
} from 'keystore-driver-library'
import { randomUUID } from 'node:crypto'

interface InternalKey {
    id: string
    name: string
    publicKey: string
    privateKey: string
}

interface InternalTransaction {
    id: string
    hash: string
    signature: string
    publicKey: string
    createdAt: Date
}
const convertInternalTransaction = (tx: InternalTransaction): Transaction => {
    return {
        txId: tx.id,
        status: 'signed',
        signature: tx.signature,
    }
}

export class InternalKeystore {
    private keystore: Map<string, InternalKey> = new Map()
    private keystoreByPublicKey: Map<string, InternalKey> = new Map()
    private transactions: Map<string, InternalTransaction> = new Map()

    public keystoreController = buildController({
        signTransaction: async (
            params: SignTransactionParams
        ): Promise<SignTransactionResult> => {
            // TODO: validate transaction here

            const key = this.keystoreByPublicKey.get(params.publicKey)
            if (key) {
                const txId = randomUUID()
                const decodedKey = naclUtil.decodeBase64(key.privateKey)
                const signature = naclUtil.encodeBase64(
                    nacl.sign.detached(
                        naclUtil.decodeBase64(params.txHash),
                        decodedKey
                    )
                )

                const internalTransaction: InternalTransaction = {
                    id: txId,
                    hash: params.txHash,
                    signature,
                    publicKey: params.publicKey,
                    createdAt: new Date(),
                }

                this.transactions.set(txId, internalTransaction)

                return Promise.resolve({
                    txId,
                    status: 'signed',
                    signature,
                } as SignTransactionResult)
            } else {
                return Promise.resolve({
                    error: 'key_not_found',
                    error_description:
                        'The provided public key does not exist in the keystore.',
                })
            }
        },

        getTransaction: async (
            params: GetTransactionParams
        ): Promise<GetTransactionResult> => {
            const tx = this.transactions.get(params.txId)
            if (tx) {
                return Promise.resolve({
                    txId: tx.id,
                    status: 'signed',
                    signature: tx.signature,
                })
            } else {
                return Promise.resolve({
                    error: 'transaction_not_found',
                    error_description:
                        'The requested transaction does not exist.',
                })
            }
        },

        getTransactions: async (
            params: GetTransactionsParams
        ): Promise<GetTransactionsResult> => {
            if (params.publicKeys || params.txIds) {
                const transactions = Array.from(
                    this.transactions.values()
                ).filter(
                    (tx) =>
                        params.txIds?.includes(tx.id) ||
                        params.publicKeys?.includes(tx.publicKey)
                )
                return Promise.resolve({
                    transactions: transactions.map(convertInternalTransaction),
                })
            } else {
                return Promise.resolve({
                    error: 'bad_arguments',
                    error_description:
                        'either public key or txIds must be supplied',
                })
            }
        },

        getKeys: async (): Promise<GetKeysResult> =>
            Promise.resolve({
                keys: Array.from(this.keystore.values()).map((key) => ({
                    id: key.id,
                    name: key.name,
                    publicKey: key.publicKey,
                })),
            } as GetKeysResult),

        createKey: async (
            params: CreateKeyParams
        ): Promise<CreateKeyResult> => {
            const key = nacl.sign.keyPair()
            const id = randomUUID()
            const publicKey = naclUtil.encodeBase64(key.publicKey)
            const privateKey = naclUtil.encodeBase64(key.secretKey)
            const internalKey: InternalKey = {
                id,
                name: params.name,
                publicKey,
                privateKey,
            }

            this.keystore.set(id, internalKey)
            this.keystoreByPublicKey.set(publicKey, internalKey)

            return Promise.resolve({
                id,
                name: params.name,
                publicKey: naclUtil.encodeBase64(key.publicKey),
            } as CreateKeyResult)
        },

        getConfiguration: async (): Promise<GetConfigurationResult> =>
            Promise.resolve({} as GetConfigurationResult),
        setConfiguration: async (
            params: SetConfigurationParams
        ): Promise<SetConfigurationResult> =>
            Promise.resolve({} as SetConfigurationResult),

        // TODO: implement subscribeTransactions - we will need to figure out how to handle subscriptions
        // when the controller is not running in a server context
        subscribeTransactions: async (
            params: SubscribeTransactionsParams
        ): Promise<SubscribeTransactionsResult> =>
            Promise.resolve({} as SubscribeTransactionsResult),
    })
}
