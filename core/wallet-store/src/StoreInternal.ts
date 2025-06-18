import { Store, Wallet, PartyId, Session, NetworkConfig } from './Store.js'

type UserId = string

interface UserService {
    connected(): boolean
    getUserId(): UserId
}

interface Memory {
    wallets: Array<Wallet>
    session: Session | undefined
}

export interface StoreInternalConfig {
    networks: Array<NetworkConfig>
}

export class StoreInternal implements Store {
    private userService: UserService
    private defaults: StoreInternalConfig
    private userMemory: Map<UserId, Memory> = new Map()

    constructor(config: StoreInternalConfig, userService: UserService) {
        this.defaults = config
        this.userService = userService
    }

    static createMemory(): Memory {
        return {
            wallets: [],
            session: undefined,
        }
    }

    private assertConnected(): void {
        if (!this.userService.connected()) {
            throw new Error('User is not connected')
        }
    }

    private getMemory(): Memory {
        this.assertConnected()
        const userId = this.userService.getUserId()
        if (!this.userMemory.has(userId)) {
            this.userMemory.set(userId, StoreInternal.createMemory())
        }
        return this.userMemory.get(userId)!
    }

    private updateMemory(memory: Memory): void {
        this.assertConnected()
        const userId = this.userService.getUserId()
        this.userMemory.set(userId, memory)
    }

    // Wallet methods
    async getWallets(): Promise<Array<Wallet>> {
        return this.getMemory().wallets
    }

    async getPrimaryWallet(): Promise<Wallet | undefined> {
        const wallets = await this.getWallets()
        return wallets.find((w) => w.primary === true)
    }

    async setPrimaryWallet(partyId: PartyId): Promise<void> {
        const memory = this.getMemory()
        if (!memory.wallets.some((w) => w.partyId === partyId)) {
            throw new Error(`Wallet with partyId "${partyId}" not found`)
        }
        const wallets = memory.wallets.map((w) => {
            if (w.partyId === partyId) {
                w.primary = true
            } else {
                w.primary = false
            }
            return w
        })
        memory.wallets = wallets
        this.updateMemory(memory)
    }

    async addWallet(wallet: Wallet): Promise<void> {
        const memory = this.getMemory()
        if (memory.wallets.some((w) => w.partyId === wallet.partyId)) {
            throw new Error(
                `Wallet with partyId "${wallet.partyId}" already exists`
            )
        }
        const wallets = await this.getWallets()
        if (wallet.primary) {
            // If the new wallet is primary, set all others to non-primary
            memory.wallets.map((w) => (w.primary = false))
        }
        wallets.push(wallet)
        memory.wallets = wallets
        this.updateMemory(memory)
    }

    // Session methods
    async getSession(): Promise<Session | undefined> {
        return this.getMemory().session
    }

    async setSession(session: Session): Promise<void> {
        const memory = this.getMemory()
        memory.session = session
        this.updateMemory(memory)
    }

    async removeSession(): Promise<void> {
        const memory = this.getMemory()
        memory.session = undefined
        this.updateMemory(memory)
    }

    // Network methods
    async getNetwork(name: string): Promise<NetworkConfig> {
        this.assertConnected()

        const networks = await this.listNetworks()
        if (!networks) throw new Error('No networks available')

        const network = networks.find((n) => n.name === name)
        if (!network) throw new Error(`Network "${name}" not found`)
        return network
    }

    async getCurrentNetwork(): Promise<NetworkConfig> {
        const networkName = this.getMemory().session?.network
        if (!networkName) {
            throw new Error('No current network set in session')
        }

        const networks = await this.listNetworks()
        const network = networks.find((n) => n.name === networkName)
        if (!network) {
            throw new Error(`Network "${networkName}" not found`)
        }
        return network
    }

    async listNetworks(): Promise<Array<NetworkConfig>> {
        return this.defaults.networks
    }

    async updateNetwork(network: NetworkConfig): Promise<void> {
        this.removeNetwork(network.name) // Ensure no duplicates
        this.defaults.networks.push(network)
    }

    async removeNetwork(name: string): Promise<void> {
        this.defaults.networks = this.defaults.networks.filter(
            (n) => n.name !== name
        )
    }
}
