import { AuthContext, UserId, AuthAware } from 'core-wallet-auth'
import {
    Store,
    Wallet,
    PartyId,
    Session,
    NetworkConfig,
    WalletFilter,
    Transaction,
} from './Store.js'

interface UserStorage {
    wallets: Array<Wallet>
    transactions: Map<string, Transaction>
    session: Session | undefined
}

export interface StoreInternalConfig {
    networks: Array<NetworkConfig>
}

type Memory = Map<UserId, UserStorage>

// TODO: remove AuthAware and instead provide wrapper in clients
export class StoreInternal implements Store, AuthAware<StoreInternal> {
    private systemStorage: StoreInternalConfig
    private userStorage: Memory

    authContext: AuthContext | undefined

    constructor(
        config: StoreInternalConfig,
        authContext?: AuthContext,
        userStorage?: Memory
    ) {
        this.systemStorage = config
        this.authContext = authContext
        this.userStorage = userStorage || new Map()
    }

    withAuthContext(context?: AuthContext): StoreInternal {
        return new StoreInternal(this.systemStorage, context, this.userStorage)
    }

    static createStorage(): UserStorage {
        return {
            wallets: [],
            transactions: new Map<string, Transaction>(),
            session: undefined,
        }
    }

    private assertConnected(): UserId {
        if (!this.authContext) {
            throw new Error('User is not connected')
        }
        return this.authContext.userId
    }

    private getStorage(): UserStorage {
        const userId = this.assertConnected()
        if (!this.userStorage.has(userId)) {
            this.userStorage.set(userId, StoreInternal.createStorage())
        }
        return this.userStorage.get(userId)!
    }

    private updateStorage(storage: UserStorage): void {
        const userId = this.assertConnected()
        this.userStorage.set(userId, storage)
    }

    // Wallet methods

    async getWallets(filter: WalletFilter = {}): Promise<Array<Wallet>> {
        const { networkIds, signingProviderIds } = filter
        const networkIdSet = networkIds ? new Set(networkIds) : null
        const signingProviderIdSet = signingProviderIds
            ? new Set(signingProviderIds)
            : null

        return this.getStorage().wallets.filter((wallet) => {
            const matchedNetworkIds = networkIdSet
                ? networkIdSet.has(wallet.networkId)
                : true
            const matchedStorageProviderIdS = signingProviderIdSet
                ? signingProviderIdSet.has(wallet.signingProviderId)
                : true
            return matchedNetworkIds && matchedStorageProviderIdS
        })
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

        if (wallets.length === 0) {
            // If this is the first wallet, set it as primary automatically
            wallet.primary = true
        }

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
        const session = this.getStorage().session
        if (!session) {
            throw new Error('No session found')
        }
        const networkId = session.network
        if (!networkId) {
            throw new Error('No current network set in session')
        }

        const networks = await this.listNetworks()
        const network = networks.find((n) => n.networkId === networkId)
        if (!network) {
            throw new Error(`Network "${networkId}" not found`)
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

    async addNetwork(network: NetworkConfig): Promise<void> {
        const networkAlreadyExists = this.systemStorage.networks.find(
            (n) => n.name === network.name
        )
        if (networkAlreadyExists) {
            throw new Error(`Network ${network.name} already exists`)
        } else {
            this.systemStorage.networks.push(network)
        }
    }

    async removeNetwork(name: string): Promise<void> {
        this.systemStorage.networks = this.systemStorage.networks.filter(
            (n) => n.name !== name
        )
    }

    // Transaction methods
    async setTransaction(transaction: Transaction): Promise<void> {
        this.assertConnected()
        const storage = this.getStorage()

        storage.transactions.set(transaction.commandId, transaction)
        this.updateStorage(storage)
    }

    async getTransaction(commandId: string): Promise<Transaction | undefined> {
        this.assertConnected()
        const storage = this.getStorage()

        return storage.transactions.get(commandId)
    }
}
