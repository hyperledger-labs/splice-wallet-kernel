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
    publicKey: string
}

export enum AddressType {
    PaperAddress = 'PaperAddress',
    CCSPAddress = 'CCSPAddress',
}

export type PartyId = string

export interface SigningDriver {
    signingDriverId: string
}

export interface SigningProvider {
    signingProviderId: string
    privateKey?: string
    addressType: AddressType
}

export interface WalletFilter {
    networkIds?: string[]
    signingProviderIds?: string[]
}

export interface Wallet {
    primary: boolean
    partyId: PartyId
    hint: string
    publicKey: string
    namespace: string
    networkId: string
    signingProviderId: string
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
    type: 'password'
    tokenUrl: string
    grantType: string
    clientId: string
    scope: string
}

export interface ImplicitAuth {
    type: 'implicit'
    domain: string
    clientId: string
    scope: string
    audience: string
}

export type Auth = PasswordAuth | ImplicitAuth

export interface NetworkConfig {
    name: string
    networkId: string
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
    listNetworks(): Promise<Array<NetworkConfig>>
    updateNetwork(network: NetworkConfig): Promise<void>
    addNetwork(network: NetworkConfig): Promise<void>
    removeNetwork(name: string): Promise<void>
}
