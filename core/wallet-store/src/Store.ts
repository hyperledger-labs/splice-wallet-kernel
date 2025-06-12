// Account

export interface Account {
    id: string
    name: string
}

// Party / Wallet

export interface PaperAddress {
    publicKey: string
    privateKey: string
}

export interface CCSPAddress {
    provider: string
    id: string
}

export type Address = PaperAddress | CCSPAddress

export type PartyId = string

export interface Wallet {
    primary: boolean
    partyId: string
    hint: string
    fingerprint: string
    address: Address
    chainId: string
}

// Session management

export interface Session {
    network: string
    accessToken: string
}

// Network and Auth configuration

export interface LedgerApi {
    baseUrl: string
}

export interface PasswordAuth {
    tokenUrl: string
    grantType: 'password'
    clientId: string
    scope: string
}

export interface ImplicitAuth {
    domain: string
    clientId: string
    scope: string
    audience: string
}

export type Auth = PasswordAuth | ImplicitAuth

export interface NetworkConfig {
    name: string
    description: string
    ledgerApi: LedgerApi
    auth: Auth
}

// Store interface for managing wallets, sessions, and networks

export interface Store {
    // Wallet methods
    getWallets(): Promise<Array<Wallet>>
    getPrimaryWallet(): Promise<Wallet | undefined>
    setPrimaryWallet(partyId: PartyId): Promise<void>
    addWallet(wallet: Wallet): Promise<void>

    // Session methods
    getSession(): Promise<Session | undefined>
    setSession(session: Session): Promise<void>
    removeSession(): Promise<void>

    // Network methods
    getNetwork(name: string): Promise<NetworkConfig>
    getCurrentNetwork(): Promise<NetworkConfig>
    updateNetwork(network: NetworkConfig): Promise<void>
    removeNetwork(name: string): Promise<void>
}

export interface AccountStore {
    getStore(account: Account): Promise<Store>
    setStore(account: Account, store: Store): Promise<void>
    removeStore(account: Account): Promise<void>
}
