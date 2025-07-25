// Disabled unused vars rule to allow for future implementations
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    buildController,
    PartyMode,
    SigningDriverInterface,
    SigningProvider,
} from 'core-signing-lib'

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
import { FireblocksHandler } from './fireblocks'
import _ from 'lodash'
import { z } from 'zod'

export interface FireblocksConfig {
    apiKey: string
    apiSecret: string
    apiPath?: string
}

const FireblocksConfigSchema = z.object({
    apiKey: z.string(),
    apiSecret: z.string(),
    apiPath: z.string().optional(),
})

export default class FireblocksSigningDriver implements SigningDriverInterface {
    private fireblocks: FireblocksHandler
    private config: FireblocksConfig

    constructor(config: FireblocksConfig) {
        this.config = config
        this.fireblocks = new FireblocksHandler(
            config.apiKey,
            config.apiSecret,
            config.apiPath || 'https://api.fireblocks.io/v1'
        )
    }
    public partyMode = PartyMode.EXTERNAL
    public signingProvider = SigningProvider.FIREBLOCKS
    public controller = buildController({
        signTransaction: async (
            params: SignTransactionParams
        ): Promise<SignTransactionResult> => {
            // TODO: validate transaction here

            try {
                const tx = await this.fireblocks.signTransaction(
                    params.txHash,
                    params.publicKey
                )
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
            for await (const tx of this.fireblocks.getTransactions()) {
                if (tx.txId === params.txId) {
                    return {
                        txId: tx.txId,
                        status: tx.status,
                        signature: tx.signature,
                        publicKey: tx.publicKey,
                    } as GetTransactionResult
                }
            }
            return {
                error: 'transaction_not_found',
                error_description: 'The requested transaction does not exist.',
            }
        },

        getTransactions: async (
            params: GetTransactionsParams
        ): Promise<GetTransactionsResult> => {
            const transactions: Transaction[] = []
            if (params.publicKeys || params.txIds) {
                const txIds = new Set(params.txIds)
                const publicKeys = new Set(params.publicKeys)
                for await (const tx of this.fireblocks.getTransactions()) {
                    if (
                        txIds.has(tx.txId) ||
                        publicKeys.has(tx.publicKey || '')
                    ) {
                        transactions.push({
                            txId: tx.txId,
                            status: tx.status,
                            signature: tx.signature,
                            publicKey: tx.publicKey,
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
                const keys = await this.fireblocks.getPublicKeys()
                return {
                    keys: keys.map((k) => ({
                        id: k.derivationPath.join('-'),
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
            _params: CreateKeyParams
        ): Promise<CreateKeyResult> => {
            return {
                error: 'not_implemented',
                error_description:
                    'Create key is not allowed in Fireblocks driver.',
            }
        },

        getConfiguration: async (): Promise<GetConfigurationResult> => {
            return this.config
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
                this.fireblocks = new FireblocksHandler(
                    validated.data.apiKey,
                    validated.data.apiSecret,
                    validated.data.apiPath || 'https://api.fireblocks.io/v1'
                )
            }
            return params
        },

        // TODO: implement subscribeTransactions - we will need to figure out how to handle subscriptions
        // when the controller is not running in a server context
        subscribeTransactions: async (
            params: SubscribeTransactionsParams
        ): Promise<SubscribeTransactionsResult> =>
            Promise.resolve({} as SubscribeTransactionsResult),
    })
}
