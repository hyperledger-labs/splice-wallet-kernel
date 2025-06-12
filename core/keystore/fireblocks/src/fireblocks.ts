import { Fireblocks, VaultAccount } from '@fireblocks/ts-sdk'

const CC_COIN_TYPE = 6767

interface PublicKey {
    derivationPath: number[]
    publicKey: string
    name: string
    algorithm: string
}

export class FireblocksHandler {
    private apiKey: string
    private apiSecret: string
    private client: Fireblocks

    constructor(apiKey: string, apiSecret: string) {
        this.apiKey = apiKey
        this.apiSecret = apiSecret
        this.client = new Fireblocks()
    }

    public async getPublicKeys(): Promise<PublicKey[]> {
        const keys: PublicKey[] = []
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
                    if (key.data.publicKey && key.data.algorithm) {
                        keys.push({
                            derivationPath: key.data.derivationPath || [],
                            publicKey: key.data.publicKey,
                            name: vault.name || vault.id,
                            algorithm: key.data.algorithm,
                        })
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching vault accounts:', error)
            throw error
        }
        return keys
    }
}
