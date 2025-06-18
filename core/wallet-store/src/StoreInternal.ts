import { Store, Wallet, PartyId, Session, NetworkConfig } from './Store.js'

type UserId = string

interface UserService {
    connected(): boolean
    getUserId(): UserId
}

interface UserStorage {
    wallets: Array<Wallet>
    session: Session | undefined
}

export interface StoreInternalConfig {
    networks: Array<NetworkConfig>
}

export class StoreInternal implements Store {
    private systemStorage: StoreInternalConfig
    private userStorage: Map<UserId, UserStorage> = new Map()
    private userService: UserService

    constructor(config: StoreInternalConfig, userService: UserService) {
        this.systemStorage = config
        this.userService = userService
    }

    static createStorage(): UserStorage {
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

    private getStorage(): UserStorage {
        this.assertConnected()
        const userId = this.userService.getUserId()
        if (!this.userStorage.has(userId)) {
            this.userStorage.set(userId, StoreInternal.createStorage())
        }
        return this.userStorage.get(userId)!
    }

    private updateStorage(storage: UserStorage): void {
        this.assertConnected()
        const userId = this.userService.getUserId()
        this.userStorage.set(userId, storage)
    }

    // Wallet methods
    async getWallets(): Promise<Array<Wallet>> {
        return this.getStorage().wallets
    }

    async getPrimaryWallet(): Promise<Wallet | undefined> {
        const wallets = await this.getWallets()
        return wallets.find((w) => w.primary === true)
    }

    async setPrimaryWallet(partyId: PartyId): Promise<void> {
        const storage = this.getStorage()
        if (!storage.wallets.some((w) => w.partyId === partyId)) {
            throw new Error(`Wallet with partyId "${partyId}" not found`)
        }
        const wallets = storage.wallets.map((w) => {
            if (w.partyId === partyId) {
                w.primary = true
            } else {
                w.primary = false
            }
            return w
        })
        storage.wallets = wallets
        this.updateStorage(storage)
    }

    async addWallet(wallet: Wallet): Promise<void> {
        const storage = this.getStorage()
        if (storage.wallets.some((w) => w.partyId === wallet.partyId)) {
            throw new Error(
                `Wallet with partyId "${wallet.partyId}" already exists`
            )
        }
        const wallets = await this.getWallets()
        if (wallet.primary) {
            // If the new wallet is primary, set all others to non-primary
            storage.wallets.map((w) => (w.primary = false))
        }
        wallets.push(wallet)
        storage.wallets = wallets
        this.updateStorage(storage)
    }

    // Session methods
    async getSession(): Promise<Session | undefined> {
        return this.getStorage().session
    }

    async setSession(session: Session): Promise<void> {
        const storage = this.getStorage()
        storage.session = session
        this.updateStorage(storage)
    }

    async removeSession(): Promise<void> {
        const storage = this.getStorage()
        storage.session = undefined
        this.updateStorage(storage)
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
        const networkName = this.getStorage().session?.network
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
        return this.systemStorage.networks
    }

    async updateNetwork(network: NetworkConfig): Promise<void> {
        this.removeNetwork(network.name) // Ensure no duplicates
        this.systemStorage.networks.push(network)
    }

    async removeNetwork(name: string): Promise<void> {
        this.systemStorage.networks = this.systemStorage.networks.filter(
            (n) => n.name !== name
        )
    }
}
