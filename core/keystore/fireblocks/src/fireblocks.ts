import { Fireblocks, VaultAccount } from '@fireblocks/ts-sdk'
import { Key, Transaction } from 'keystore-driver-library'
import { z } from 'zod'

const CC_COIN_TYPE = 6767

// interface PublicKey {
//     derivationPath: number[]
//     publicKey: string
//     name: string
//     algorithm: string
// }
//
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

export class FireblocksHandler {
    private apiKey: string
    private apiSecret: string
    private client: Fireblocks
    private keyCache: Map<string, Key> = new Map() // key cache by publicKey
    private keyCacheByDerivationPath: Map<number[], Key> = new Map()

    constructor(apiKey: string, apiSecret: string) {
        this.apiKey = apiKey
        this.apiSecret = apiSecret
        this.client = new Fireblocks()
    }

    // Get public keys from Fireblocks vault accounts.
    // This will also refresh the key cache.
    public async getPublicKeys(): Promise<Key[]> {
        const keys: Key[] = []
        try {
            const vaultAccounts: VaultAccount[] = []
            let after: string | undefined = undefined

            while (after !== undefined) {
                const resp = await this.client.vaults.getPagedVaultAccounts({
                    after,
                })
                after = resp.data.paging?.after
                vaultAccounts.push(...(resp.data.accounts || []))
            }

            for (const vault of vaultAccounts) {
                if (vault.id) {
                    const derivationPath = `[44, ${CC_COIN_TYPE}, {vault.id}, 0, 0]`
                    const key = await this.client.vaults.getPublicKeyInfo({
                        algorithm: 'MPC_EDDSA_ED25519',
                        derivationPath,
                    })
                    if (key.data.publicKey && key.data.algorithm && key.data.derivationPath) {
                        const storedKey = {
                            id: key.data.derivationPath?.join('-'),
                            derivationPath: key.data.derivationPath || [],
                            publicKey: key.data.publicKey,
                            name: vault.name || vault.id,
                            algorithm: key.data.algorithm,
                        }
                        keys.push(storedKey)
                        this.keyCache.set(storedKey.publicKey, storedKey)
                        this.keyCacheByDerivationPath.set(key.data.derivationPath, storedKey)
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching vault accounts:', error)
            throw error
        }
        return keys
    }

    public async getTransactions(): Promise<Transaction[]> {
        const allTransactions: Transaction[] = []
        try {
            const transactions = await this.client.transactions.getTransactions({
                sourceType: 'VAULT_ACCOUNT',
                limit: 500,
            })

            for (const tx of transactions.data) {
                if (
                    !tx.id ||
                    tx.operation !== 'RAW' ||
                    !tx.extraParameters ||
                    !('rawMessageData' in tx.extraParameters)
                ) {
                    continue // Skip transactions without signed messages since they are not raw transactions
                }

                if (tx.signedMessages && tx.signedMessages.length > 0) {
                    const signedMessage = tx.signedMessages[0]
                    if (!signedMessage.publicKey || !signedMessage.content || !signedMessage.signature) {
                        throw new Error(`Transaction ${tx.id} has no public key or content in signed message`)
                    }
                    allTransactions.push({
                        txId: tx.id,
                        status: 'signed',
                        publicKey: signedMessage.publicKey,
                        // TODO: will this ever be v/s?
                        signature: signedMessage.signature.fullSig,
                        metadata: {},
                    })
                } else {
                    const rawMessageData = RawMessageExtraParametersSchema.safeParse(tx.extraParameters)
                    if (!rawMessageData.success) {
                        console.error(`Transaction ${tx.id} has invalid rawMessageData:`, rawMessageData.error)
                        continue // Skip transactions with invalid rawMessageData
                    }
                    const derivationPath = rawMessageData.data.rawMessageData.messages[0].derivationPath
                    if (!this.keyCacheByDerivationPath.has(derivationPath)) {
                        await this.getPublicKeys() // Refresh the key cache
                    }
                    const publicKey = this.keyCacheByDerivationPath.get(derivationPath)
                    if (!publicKey) {
                        continue
                    }

                    const status =
                        tx.status === 'REJECTED' || tx.status === 'BLOCKED'
                            ? 'rejected'
                            : tx.status === 'FAILED'
                              ? 'failed'
                              : 'pending'
                    allTransactions.push({
                        txId: tx.id,
                        status: status,
                        publcicKey: publicKey.publicKey,
                        metadata: {},
                    })
                }
            }
        } catch (error) {
            console.error('Error fetching signatures', error)
            throw error
        }
        return allTransactions
    }
}
