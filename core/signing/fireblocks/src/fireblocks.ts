import {
    Fireblocks,
    PublicKeyInformationAlgorithmEnum,
    VaultAccount,
} from '@fireblocks/ts-sdk'
import { SigningStatusEnum } from 'core-signing-lib'
import { z } from 'zod'
import { readFileSync } from 'fs-extra'
import path from 'path'

const CC_COIN_TYPE = 6767

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

interface FireblocksTransaction {
    txId: string
    status: SigningStatusEnum
    signature?: string | undefined
    publicKey?: string | undefined
    derivationPath: number[]
}

export class FireblocksHandler {
    private client: Fireblocks
    private keyCache: Map<string, FireblocksKey> = new Map() // key cache by publicKey
    private keyCacheByDerivationPath: Map<string, FireblocksKey> = new Map()
    private allTransactions: FireblocksTransaction[] = []

    constructor(
        apiKey: string,
        secretLocation: string,
        apiPath: string = 'https://api.fireblocks.io/v1'
    ) {
        const secretPath = path.resolve(process.cwd(), secretLocation)
        const secret = readFileSync(secretPath, 'utf8')
        this.client = new Fireblocks({
            apiKey: apiKey,
            basePath: apiPath,
            secretKey: secret,
        })
    }

    // Get public keys from Fireblocks vault accounts.
    // This will also refresh the key cache.
    public async getPublicKeys(): Promise<FireblocksKey[]> {
        const keys: FireblocksKey[] = []
        try {
            const vaultAccounts: VaultAccount[] = []
            let after: string | undefined = undefined

            do {
                const resp = await this.client.vaults.getPagedVaultAccounts(
                    after ? { after } : {}
                )
                after = resp.data.paging?.after
                vaultAccounts.push(...(resp.data.accounts || []))
            } while (after !== undefined)

            for (const vault of vaultAccounts) {
                if (vault.id) {
                    const derivationPath = `[44, ${CC_COIN_TYPE}, ${vault.id}, 0, 0]`
                    const key = await this.client.vaults.getPublicKeyInfo({
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
                        this.keyCache.set(storedKey.publicKey, storedKey)
                        this.keyCacheByDerivationPath.set(
                            JSON.stringify(key.data.derivationPath),
                            storedKey
                        )
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching vault accounts:', error)
            throw error
        }
        return keys
    }

    public async getTransactions(): Promise<FireblocksTransaction[]> {
        let refreshedCache = false
        try {
            const transactions = await this.client.transactions.getTransactions(
                {
                    sourceType: 'VAULT_ACCOUNT',
                    limit: 500,
                }
            )
            for (const tx of transactions.data) {
                if (
                    !tx.id ||
                    tx.operation !== 'RAW' ||
                    !tx.extraParameters ||
                    !('rawMessageData' in tx.extraParameters)
                ) {
                    continue // Skip transactions that are not RAW or do not conform to expected structure
                }

                if (tx.signedMessages && tx.signedMessages.length > 0) {
                    const signedMessage = tx.signedMessages[0]
                    if (
                        !signedMessage.publicKey ||
                        !signedMessage.content ||
                        !signedMessage.signature
                    ) {
                        throw new Error(
                            `Transaction ${tx.id} has no public key or content in signed message`
                        )
                    }
                    this.allTransactions.push({
                        txId: tx.id,
                        status: 'signed',
                        publicKey: signedMessage.publicKey,
                        // TODO: will this ever be v/s?
                        signature: signedMessage.signature.fullSig,
                        derivationPath: signedMessage.derivationPath!,
                    })
                } else {
                    const rawMessageData =
                        RawMessageExtraParametersSchema.safeParse(
                            tx.extraParameters
                        )
                    if (!rawMessageData.success) {
                        continue // Skip transactions with invalid rawMessageData
                    }
                    const message =
                        rawMessageData.data.rawMessageData.messages[0]
                    const derivationPath = JSON.stringify(
                        message.derivationPath
                    )

                    if (
                        !this.keyCacheByDerivationPath.has(derivationPath) &&
                        !refreshedCache
                    ) {
                        // Refresh the key cache only once in case the cache has not been populated
                        // since the transaction was created - however do not repeatedly refresh
                        // in case of derivation paths that definitely do not exist
                        console.log(
                            'Refreshing key cache for derivation path:',
                            derivationPath
                        )
                        await this.getPublicKeys()
                        refreshedCache = true
                    }
                    const publicKey =
                        this.keyCacheByDerivationPath.get(derivationPath)

                    const status =
                        tx.status === 'REJECTED' || tx.status === 'BLOCKED'
                            ? 'rejected'
                            : tx.status === 'FAILED'
                              ? 'failed'
                              : 'pending'
                    this.allTransactions.push({
                        txId: tx.id,
                        status: status,
                        publicKey: publicKey?.publicKey,
                        derivationPath: message.derivationPath,
                    })
                }
            }
        } catch (error) {
            console.error('Error fetching signatures', error)
            throw error
        }
        return this.allTransactions
    }
    public async signTransaction(
        tx: string,
        publicKey: string
    ): Promise<FireblocksTransaction> {
        try {
            if (!this.keyCache.has(publicKey)) {
                await this.getPublicKeys() // Refresh the key cache
            }
            const key = this.keyCache.get(publicKey)
            if (!key) {
                throw new Error(`Public key ${publicKey} not found in cache`)
            }

            const transaction =
                await this.client.transactions.createTransaction({
                    transactionRequest: {
                        operation: 'RAW',
                        note: `Signing transaction with public key ${publicKey}`,
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

            return {
                txId: transaction.data.id!,
                status: 'pending',
                publicKey: key.publicKey,
                derivationPath: key.derivationPath,
            }
        } catch (error) {
            console.error('Error refreshing key cache:', error)
            throw error
        }
    }
}
