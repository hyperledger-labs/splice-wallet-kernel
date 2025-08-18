import { Logger } from 'pino'
import { AuthContext, UserId, AuthAware } from 'core-wallet-auth'
import {
    Store,
    Wallet,
    PartyId,
    Session,
    WalletFilter,
    Transaction,
    Network,
    Auth,
} from 'core-wallet-store'
import { Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'

interface AuthTable {
    identityProviderId: string
    type: string
    issuer: string
    configUrl: string
    audience: string
    tokenUrl: string
    grantType: string
    scope: string
    clientId: string
    clientSecret: string
    adminClientId: string
    adminClientSecret: string
}

interface NetworkTable {
    name: string
    chainId: string
    synchronizerId: string
    description: string
    ledgerApiBaseUrl: string
    ledgerApiAdminGrpcUrl: string
    userId: UserId | undefined // global if undefined
    identityProviderId: string
}

interface WalletTable extends Wallet {
    userId: UserId
}

interface TransactionTable extends Transaction {
    userId: UserId
}

interface SessionTable extends Session {
    userId: UserId
}

export interface DB {
    auths: AuthTable
    networks: NetworkTable
    wallets: WalletTable
    transactions: TransactionTable
    sessions: SessionTable
}

const toAuth = (table: AuthTable): Auth => {
    switch (table.type) {
        case 'password':
            return {
                identityProviderId: table.identityProviderId,
                type: table.type,
                issuer: table.issuer,
                configUrl: table.configUrl,
                audience: table.audience,
                tokenUrl: table.tokenUrl,
                grantType: table.grantType,
                scope: table.scope,
                clientId: table.clientId,
                admin: {
                    clientId: table.adminClientId,
                    clientSecret: table.adminClientSecret,
                },
            }
        case 'implicit':
            return {
                identityProviderId: table.identityProviderId,
                type: table.type,
                issuer: table.issuer,
                configUrl: table.configUrl,
                audience: table.audience,
                scope: table.scope,
                clientId: table.clientId,
                admin: {
                    clientId: table.adminClientId,
                    clientSecret: table.adminClientSecret,
                },
            }
        case 'client_credentials':
            return {
                identityProviderId: table.identityProviderId,
                type: table.type,
                issuer: table.issuer,
                configUrl: table.configUrl,
                audience: table.audience,
                scope: table.scope,
                clientId: table.clientId,
                clientSecret: table.clientSecret,
                admin: {
                    clientId: table.adminClientId,
                    clientSecret: table.adminClientSecret,
                },
            }
        default:
            throw new Error(`Unknown auth type: ${table.type}`)
    }
}

const fromAuth = (auth: Auth): AuthTable => {
    switch (auth.type) {
        case 'password':
            return {
                identityProviderId: auth.identityProviderId,
                type: auth.type,
                issuer: auth.issuer,
                configUrl: auth.configUrl,
                audience: auth.audience,
                tokenUrl: auth.tokenUrl,
                grantType: auth.grantType,
                scope: auth.scope,
                clientId: auth.clientId,
                clientSecret: '',
                adminClientId: auth.admin?.clientId || '',
                adminClientSecret: auth.admin?.clientSecret || '',
            }
        case 'implicit':
            return {
                identityProviderId: auth.identityProviderId,
                type: auth.type,
                issuer: auth.issuer,
                configUrl: auth.configUrl,
                audience: auth.audience,
                tokenUrl: '',
                grantType: '',
                scope: auth.scope,
                clientId: auth.clientId,
                clientSecret: '',
                adminClientId: auth.admin?.clientId || '',
                adminClientSecret: auth.admin?.clientSecret || '',
            }
        case 'client_credentials':
            return {
                identityProviderId: auth.identityProviderId,
                type: auth.type,
                issuer: auth.issuer,
                configUrl: auth.configUrl,
                audience: auth.audience,
                tokenUrl: '',
                grantType: '',
                scope: auth.scope,
                clientId: auth.clientId,
                clientSecret: auth.clientSecret,
                adminClientId: auth.admin?.clientId || '',
                adminClientSecret: auth.admin?.clientSecret || '',
            }
        default:
            throw new Error(`Unknown auth type`)
    }
}

const toNetwork = (table: NetworkTable, authTable?: AuthTable): Network => {
    if (!authTable) {
        throw new Error(`Missing auth table for network: ${table.name}`)
    }
    return {
        name: table.name,
        chainId: table.chainId,
        synchronizerId: table.synchronizerId,
        description: table.description,
        ledgerApi: {
            baseUrl: table.ledgerApiBaseUrl,
            adminGrpcUrl: table.ledgerApiAdminGrpcUrl,
        },
        auth: toAuth(authTable),
    }
}

const fromNetwork = (network: Network, userId: UserId): NetworkTable => {
    return {
        name: network.name,
        chainId: network.chainId,
        synchronizerId: network.synchronizerId,
        description: network.description,
        ledgerApiBaseUrl: network.ledgerApi.baseUrl,
        ledgerApiAdminGrpcUrl: network.ledgerApi.adminGrpcUrl,
        userId: userId,
        identityProviderId: network.auth.identityProviderId,
    }
}

export class StoreSql implements Store, AuthAware<StoreSql> {
    authContext: AuthContext | undefined

    constructor(
        private db: Kysely<DB>,
        private logger: Logger,
        authContext?: AuthContext
    ) {
        this.logger = logger.child({ component: 'StoreInternal' })
        this.authContext = authContext

        // this.syncWallets()
    }

    withAuthContext(context?: AuthContext): StoreSql {
        return new StoreSql(this.db, this.logger, context)
    }

    private assertConnected(): UserId {
        if (!this.authContext) {
            throw new Error('User is not connected')
        }
        return this.authContext.userId
    }

    // Wallet methods

    async getWallets(filter: WalletFilter = {}): Promise<Array<Wallet>> {
        const userId = this.assertConnected()
        const { chainIds, signingProviderIds } = filter
        const chainIdSet = chainIds ? new Set(chainIds) : null
        const signingProviderIdSet = signingProviderIds
            ? new Set(signingProviderIds)
            : null

        const wallets = await this.db
            .selectFrom('wallets')
            .selectAll()
            .where('userId', '=', userId)
            .execute()

        return wallets.filter((wallet) => {
            const matchedChainIds = chainIdSet
                ? chainIdSet.has(wallet.chainId)
                : true
            const matchedStorageProviderIdS = signingProviderIdSet
                ? signingProviderIdSet.has(wallet.signingProviderId)
                : true
            return matchedChainIds && matchedStorageProviderIdS
        })
    }

    async getPrimaryWallet(): Promise<Wallet | undefined> {
        const wallets = await this.getWallets()
        return wallets.find((w) => w.primary === true)
    }

    async setPrimaryWallet(partyId: PartyId): Promise<void> {
        const wallets = await this.getWallets()
        if (!wallets.some((w) => w.partyId === partyId)) {
            throw new Error(`Wallet with partyId "${partyId}" not found`)
        }

        const primary = wallets.find((w) => w.primary === true)

        await this.db.transaction().execute(async (trx) => {
            if (primary) {
                await trx
                    .updateTable('wallets')
                    .set({ primary: false })
                    .where('partyId', '=', primary.partyId)
                    .execute()
            }
            await trx
                .updateTable('wallets')
                .set({ primary: true })
                .where('partyId', '=', partyId)
                .execute()
        })
    }

    async addWallet(wallet: Wallet): Promise<void> {
        const userId = this.assertConnected()

        const wallets = await this.getWallets()
        if (wallets.some((w) => w.partyId === wallet.partyId)) {
            throw new Error(
                `Wallet with partyId "${wallet.partyId}" already exists`
            )
        }

        if (wallets.length === 0) {
            // If this is the first wallet, set it as primary automatically
            wallet.primary = true
        }

        await this.db.transaction().execute(async (trx) => {
            if (wallet.primary) {
                // If the new wallet is primary, set all others to non-primary
                await trx
                    .updateTable('wallets')
                    .set({ primary: false })
                    .where((eb) =>
                        eb.and([
                            eb('primary', '=', true),
                            eb('userId', '=', userId),
                        ])
                    )
                    .execute()
            }
            await trx
                .insertInto('wallets')
                .values({ ...wallet, userId })
                .execute()
        })
    }

    // Session methods
    async getSession(): Promise<Session | undefined> {
        const sessions = await this.db
            .selectFrom('sessions')
            .selectAll()
            .executeTakeFirst()
        return sessions
    }

    async setSession(session: Session): Promise<void> {
        const userId = this.assertConnected()
        await this.db.transaction().execute(async (trx) => {
            await trx
                .deleteFrom('sessions')
                .where('userId', '=', userId)
                .execute()
            await trx
                .insertInto('sessions')
                .values({ ...session, userId })
                .execute()
        })
    }

    async removeSession(): Promise<void> {
        const userId = this.assertConnected()
        await this.db
            .deleteFrom('sessions')
            .where('userId', '=', userId)
            .execute()
    }

    // Network methods
    async getNetwork(chainId: string): Promise<Network> {
        this.assertConnected()

        const networks = await this.listNetworks()
        if (!networks) throw new Error('No networks available')

        const network = networks.find((n) => n.chainId === chainId)
        if (!network) throw new Error(`Network "${chainId}" not found`)
        return network
    }

    async getCurrentNetwork(): Promise<Network> {
        const session = await this.getSession()
        if (!session) {
            throw new Error('No session found')
        }
        const chainId = session.network
        if (!chainId) {
            throw new Error('No current network set in session')
        }

        const networks = await this.listNetworks()
        const network = networks.find((n) => n.chainId === chainId)
        if (!network) {
            throw new Error(`Network "${chainId}" not found`)
        }
        return network
    }

    async listNetworks(): Promise<Array<Network>> {
        let query = this.db.selectFrom('networks').selectAll()

        if (this.authContext) {
            const userId = this.assertConnected()
            query = query.where((eb) =>
                eb.or([
                    eb('userId', 'is', null), // Global networks
                    eb('userId', '=', userId), // User-specific networks
                ])
            )
        } else {
            query = query.where('userId', 'is', null) // Only global networks
        }

        const networks = await query.execute()
        const auths = await this.db.selectFrom('auths').selectAll().execute()
        const idpMap = new Map(
            auths.map((auth) => [auth.identityProviderId, auth])
        )
        return networks.map((table) =>
            toNetwork(table, idpMap.get(table.identityProviderId))
        )
    }

    async updateNetwork(network: Network): Promise<void> {
        const userId = this.assertConnected()
        await this.db.transaction().execute(async (trx) => {
            await trx
                .updateTable('networks')
                .set({ ...network, userId })
                .where('chainId', '=', network.chainId)
                .execute()
            await this.db
                .updateTable('auths')
                .set(fromAuth(network.auth))
                .where(
                    'identityProviderId',
                    '=',
                    network.auth.identityProviderId
                )
                .execute()
        })
    }

    async addNetwork(network: Network): Promise<void> {
        const userId = this.assertConnected()
        await this.db.transaction().execute(async (trx) => {
            const networkAlreadyExists = await trx
                .selectFrom('networks')
                .selectAll()
                .where('chainId', '=', network.chainId)
                .executeTakeFirst()
            if (networkAlreadyExists) {
                throw new Error(`Network ${network.chainId} already exists`)
            } else {
                await trx
                    .insertInto('auths')
                    .values(fromAuth(network.auth))
                    .execute()
                await trx
                    .insertInto('networks')
                    .values(fromNetwork(network, userId))
                    .execute()
            }
        })
    }

    async removeNetwork(chainId: string): Promise<void> {
        const userId = this.assertConnected()
        await this.db.transaction().execute(async (trx) => {
            const network = await trx
                .selectFrom('networks')
                .selectAll()
                .where('chainId', '=', chainId)
                .executeTakeFirst()
            if (!network) {
                throw new Error(`Network ${chainId} does not exists`)
            }
            if (network.userId !== userId) {
                throw new Error(
                    `Network ${chainId} is not owned by user ${userId}`
                )
            }
            await trx
                .deleteFrom('networks')
                .where('chainId', '=', chainId)
                .execute()
            await trx
                .deleteFrom('auths')
                .where('identityProviderId', '=', network.identityProviderId)
                .execute()
        })
    }

    // Transaction methods
    async setTransaction(transaction: Transaction): Promise<void> {
        const userId = this.assertConnected()
        await this.db
            .insertInto('transactions')
            .values({ ...transaction, userId })
            .execute()
    }

    async getTransaction(commandId: string): Promise<Transaction | undefined> {
        const userId = this.assertConnected()
        const transaction = await this.db
            .selectFrom('transactions')
            .selectAll()
            .where((eb) =>
                eb.and([
                    eb('commandId', '=', commandId),
                    eb('userId', '=', userId),
                ])
            )
            .executeTakeFirst()
        return transaction
    }
}

export const StoreSqlite = new Kysely<DB>({
    dialect: new SqliteDialect({
        database: new Database('store.sqlite'),
    }),
})
