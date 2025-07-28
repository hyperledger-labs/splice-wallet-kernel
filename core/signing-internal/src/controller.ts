// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    buildController,
    PartyMode,
    SigningDriverInterface,
    SigningProvider,
} from 'core-signing-lib'
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
} from 'core-signing-lib'
import { randomUUID } from 'node:crypto'
import { AuthContext } from 'core-wallet-auth'

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
        publicKey: tx.publicKey,
    }
}

export class InternalSigningDriver implements SigningDriverInterface {
    private signer: Map<string, InternalKey> = new Map()
    private signerByPublicKey: Map<string, InternalKey> = new Map()
    private transactions: Map<string, InternalTransaction> = new Map()

    public partyMode = PartyMode.EXTERNAL
    public signingProvider = SigningProvider.WALLET_KERNEL

    public controller = (
        _authContext: AuthContext // eslint-disable-line @typescript-eslint/no-unused-vars
    ) =>
        buildController({
            signTransaction: async (
                params: SignTransactionParams
            ): Promise<SignTransactionResult> => {
                // TODO: validate transaction here

                const key = this.signerByPublicKey.get(params.publicKey)
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
                            'The provided public key does not exist in the signing.',
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
                        transactions: transactions.map(
                            convertInternalTransaction
                        ),
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
                    keys: Array.from(this.signer.values()).map((key) => ({
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

                this.signer.set(id, internalKey)
                this.signerByPublicKey.set(publicKey, internalKey)

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
