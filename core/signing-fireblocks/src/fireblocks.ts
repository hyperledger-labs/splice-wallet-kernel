import {
    Fireblocks,
    PublicKeyInformationAlgorithmEnum,
    TransactionResponse,
    VaultAccount,
} from '@fireblocks/ts-sdk'
import { pino } from 'pino'
import { SigningStatus, CC_COIN_TYPE } from 'core-signing-lib'
import { z } from 'zod'

const RawMessageSchema = z.object({
    content: z.string(),
    derivationPath: z.array(z.number()),
})

const RawMessageDataSchema = z.object({
    messages: z.array(RawMessageSchema),
    algorithm: z.string(),
})

const RawMessageExtraParametersSchema = z.object({
    rawMessageData: RawMessageDataSchema,
})

interface FireblocksKey {
    name: string
    publicKey: string
    derivationPath: number[]
    algorithm: PublicKeyInformationAlgorithmEnum
}

export interface FireblocksTransaction {
    txId: string
    status: SigningStatus
    createdAt?: number
    signature?: string | undefined
    publicKey?: string | undefined
    derivationPath: number[]
}

export interface FireblocksKeyInfo {
    apiKey: string
    apiSecret: string
}

const logger = pino({ name: 'main', level: 'debug' })

export class FireblocksHandler {
    private defaultClient: Fireblocks | undefined = undefined
    private clients: Map<string, Fireblocks> = new Map()
    private keyCacheByPublicKey: Map<string, FireblocksKey> = new Map()
    private keyCacheByDerivationPath: Map<string, FireblocksKey> = new Map()

    // a list of derivation paths that have show up in transactions but have not been found in the vaults
    // this is used to avoid repeatedly refreshing the key cache for derivation paths that definitely do not exist
    private missingDerivationPaths: Set<string> = new Set()

    private getClient = (userId: string | undefined): Fireblocks => {
        if (userId !== undefined && this.clients.has(userId)) {
            return this.clients.get(userId)!
        } else if (this.defaultClient) {
            return this.defaultClient
        } else {
            throw new Error('No Fireblocks client available for this user.')
        }
    }

    constructor(
        defaultKey: FireblocksKeyInfo | undefined,
        userKeys: Map<string, FireblocksKeyInfo>,
        apiPath: string = 'https://api.fireblocks.io/v1'
    ) {
        if (defaultKey) {
            this.defaultClient = new Fireblocks({
                apiKey: defaultKey.apiKey,
                basePath: apiPath,
                secretKey: defaultKey.apiSecret,
            })
        }
        userKeys.forEach((keyInfo, userId) => {
            const client = new Fireblocks({
                apiKey: keyInfo.apiKey,
                basePath: apiPath,
                secretKey: keyInfo.apiSecret,
            })
            this.clients.set(userId, client)
        })
    }

    /**
     * Get public keys from Fireblocks vault accounts. This will
     * also refresh the key cache.
     * @returns List of Fireblocks public keys
     */
    public async getPublicKeys(
        userId: string | undefined
    ): Promise<FireblocksKey[]> {
        const keys: FireblocksKey[] = []
        try {
            const client = this.getClient(userId)
            const vaultAccounts: VaultAccount[] = []
            let after: string | undefined = undefined

            do {
                const resp = await client.vaults.getPagedVaultAccounts(
                    after ? { after } : {}
                )
                after = resp.data.paging?.after
                vaultAccounts.push(...(resp.data.accounts || []))
            } while (after !== undefined)

            for (const vault of vaultAccounts) {
                if (vault.id) {
                    const derivationPath = `[44, ${CC_COIN_TYPE}, ${vault.id}, 0, 0]`
                    const key = await client.vaults.getPublicKeyInfo({
                        algorithm: 'MPC_EDDSA_ED25519',
                        derivationPath,
                    })
                    if (
                        key.data.publicKey &&
                        key.data.algorithm &&
                        key.data.derivationPath
                    ) {
                        const storedKey = {
                            derivationPath: key.data.derivationPath || [],
                            publicKey: key.data.publicKey,
                            name: vault.name || vault.id,
                            algorithm: key.data.algorithm,
                        }
                        keys.push(storedKey)
                        this.keyCacheByPublicKey.set(
                            storedKey.publicKey,
                            storedKey
                        )
                        this.keyCacheByDerivationPath.set(
                            JSON.stringify(key.data.derivationPath),
                            storedKey
                        )
                    }
                }
            }
        } catch (error) {
            logger.error('Error fetching vault accounts:', error)
            throw error
        }
        return keys
    }

    private async formatTransaction(
        userId: string | undefined,
        tx: TransactionResponse
    ): Promise<FireblocksTransaction | undefined> {
        if (tx.signedMessages && tx.signedMessages.length > 0) {
            const signedMessage = tx.signedMessages[0]
            if (
                !signedMessage.publicKey ||
                !signedMessage.content ||
                !signedMessage.signature
            ) {
                return undefined
            }
            return {
                txId: tx.id!,
                status: 'signed',
                createdAt: tx.createdAt!,
                publicKey: signedMessage.publicKey,
                signature: signedMessage.signature.fullSig,
                derivationPath: signedMessage.derivationPath!,
            }
        } else {
            const rawMessageData = RawMessageExtraParametersSchema.safeParse(
                tx.extraParameters
            )
            if (!rawMessageData.success) {
                // Skip transactions with invalid rawMessageData
                return undefined
            }
            const message = rawMessageData.data.rawMessageData.messages[0]
            const derivationPath = JSON.stringify(message.derivationPath)

            const publicKey = await this.lookupPublicKey(userId, derivationPath)

            const status =
                tx.status === 'REJECTED' || tx.status === 'BLOCKED'
                    ? 'rejected'
                    : tx.status === 'FAILED'
                      ? 'failed'
                      : 'pending'
            return {
                txId: tx.id!,
                status: status,
                createdAt: tx.createdAt!,
                publicKey: publicKey?.publicKey,
                derivationPath: message.derivationPath,
            }
        }
    }
    private async lookupPublicKey(
        userId: string | undefined,
        derivationPath: string
    ): Promise<FireblocksKey | undefined> {
        if (
            !this.keyCacheByDerivationPath.has(derivationPath) &&
            !this.missingDerivationPaths.has(derivationPath)
        ) {
            // Refresh the key cache only once per missing derivation path in case the cache has not been
            // repopulated since the transaction was created, however do not repeatedly refresh the cache
            // for this derivation path in case it definitely does not exist
            await this.getPublicKeys(userId)
            this.missingDerivationPaths.add(derivationPath)
        }

        if (this.keyCacheByDerivationPath.has(derivationPath)) {
            this.missingDerivationPaths.delete(derivationPath)
            return this.keyCacheByDerivationPath.get(derivationPath)
        } else {
            return undefined
        }
    }

    public async getTransaction(
        userId: string | undefined,
        txId: string
    ): Promise<FireblocksTransaction | undefined> {
        try {
            const client = this.getClient(userId)
            const transaction = await client.transactions.getTransaction({
                txId: txId,
            })
            return await this.formatTransaction(userId, transaction.data)
        } catch {
            // if the transaction was not found for any reason, return undefined
            return undefined
        }
    }

    /**
     * Get all RAW transactions from Fireblocks. Returns an async generator as
     * this may return a large number of transactions and will occasionally need to
     * refresh the key cache.
     * @returns AsyncGenerator of FireblocksTransactions
     */
    public async *getTransactions(
        userId: string | undefined,
        {
            limit = 200,
            before,
        }: {
            limit?: number
            before?: number
        } = {}
    ): AsyncGenerator<FireblocksTransaction> {
        let fetchedLength = 0
        let beforeQuery: number | undefined = before
        try {
            const client = this.getClient(userId)
            do {
                const transactions = await client.transactions.getTransactions({
                    sourceType: 'VAULT_ACCOUNT',
                    limit,
                    ...(beforeQuery ? { before: beforeQuery.toString() } : {}),
                })
                fetchedLength = transactions.data.length
                for (const tx of transactions.data) {
                    // set next before to createdAt - 1 as before is inclusive of any transaction exactly at that
                    // timestamp
                    beforeQuery = tx.createdAt! - 1
                    const formatTransaction = await this.formatTransaction(
                        userId,
                        tx
                    )
                    if (formatTransaction) {
                        yield formatTransaction
                    } else {
                        // if the transaction failed to format, continue so we do not skip remaining valid transactions
                        continue
                    }
                }
                // once the fetched length is 0 before our last createdAt tx,
                // there will be no transactions to fetch
            } while (fetchedLength > 0)
        } catch (error) {
            logger.error('Error fetching signatures', error)
            throw error
        }
    }
    /**
     * Sign a transaction using a public key
     * @param tx - The transaction to sign, as a string
     * @param publicKey - The public key to use for signing
     * @param externalTxId - The transaction ID assigned by the wallet kernel
     * @return The transaction object from Fireblocks
     */
    public async signTransaction(
        userId: string | undefined,
        tx: string,
        publicKey: string,
        externalTxId?: string
    ): Promise<FireblocksTransaction> {
        try {
            const client = this.getClient(userId)
            if (!this.keyCacheByPublicKey.has(publicKey)) {
                // refresh the keycache
                await this.getPublicKeys(userId)
            }
            const key = this.keyCacheByPublicKey.get(publicKey)
            if (!key) {
                throw new Error(`Public key ${publicKey} not found in cache`)
            }

            const transaction = await client.transactions.createTransaction({
                transactionRequest: {
                    operation: 'RAW',
                    note: `Signing transaction with public key ${publicKey}`,
                    externalTxId,
                    extraParameters: {
                        rawMessageData: {
                            messages: [
                                {
                                    content: tx,
                                    derivationPath: key.derivationPath,
                                },
                            ],
                            algorithm: key.algorithm,
                        },
                    },
                },
            })
            let status: SigningStatus = 'pending'
            switch (transaction.data.status) {
                case 'REJECTED':
                    status = 'rejected'
                    break
                case 'COMPLETED':
                    status = 'signed'
                    break
                case 'CANCELLED':
                case 'FAILED':
                case 'BLOCKED':
                    status = 'failed'
                    break
            }

            return {
                txId: transaction.data.id!,
                status,
                publicKey: key.publicKey,
                derivationPath: key.derivationPath,
            }
        } catch (error) {
            logger.error('Error signing transaction:', error)
            throw error
        }
    }
}
