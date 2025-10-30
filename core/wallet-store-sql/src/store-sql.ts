// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from 'pino'
import {
    AuthContext,
    UserId,
    AuthAware,
    assertConnected,
} from '@canton-network/core-wallet-auth'
import {
    Store as BaseStore,
    Wallet,
    PartyId,
    Session,
    WalletFilter,
    Transaction,
    Network,
    StoreConfig,
} from '@canton-network/core-wallet-store'
import { CamelCasePlugin, Kysely, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import {
    DB,
    fromAuth,
    fromNetwork,
    fromTransaction,
    fromWallet,
    toNetwork,
    toTransaction,
    toWallet,
} from './schema.js'

export class StoreSql implements BaseStore, AuthAware<StoreSql> {
    authContext: AuthContext | undefined

    constructor(
        private db: Kysely<DB>,
        private logger: Logger,
        authContext?: AuthContext
    ) {
        this.logger = logger.child({ component: 'StoreSql' })
        this.authContext = authContext

        // this.syncWallets()
    }

    withAuthContext(context?: AuthContext): StoreSql {
        return new StoreSql(this.db, this.logger, context)
    }

    private assertConnected(): UserId {
        return assertConnected(this.authContext).userId
    }

    // Wallet methods

    async getWallets(filter: WalletFilter = {}): Promise<Array<Wallet>> {
        const userId = this.assertConnected()
        const { networkIds, signingProviderIds } = filter
        const networkIdSet = networkIds ? new Set(networkIds) : null
        const signingProviderIdSet = signingProviderIds
            ? new Set(signingProviderIds)
            : null

        const wallets = await this.db
            .selectFrom('wallets')
            .selectAll()
            .where('userId', '=', userId)
            .execute()

        return wallets
            .filter((wallet) => {
                const matchedNetworkIds = networkIdSet
                    ? networkIdSet.has(wallet.networkId)
                    : true
                const matchedSigningProviderIds = signingProviderIdSet
                    ? signingProviderIdSet.has(wallet.signingProviderId)
                    : true
                return matchedNetworkIds && matchedSigningProviderIds
            })
            .map((table) => toWallet(table))
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
                    .set({ primary: 0 })
                    .where('partyId', '=', primary.partyId)
                    .execute()
            }
            await trx
                .updateTable('wallets')
                .set({ primary: 1 })
                .where('partyId', '=', partyId)
                .execute()
        })
    }

    async addWallet(wallet: Wallet): Promise<void> {
        this.logger.info('Adding wallet')
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
                    .set({ primary: 0 })
                    .where((eb) =>
                        eb.and([
                            eb('primary', '=', 1),
                            eb('userId', '=', userId),
                        ])
                    )
                    .execute()
            }
            await trx
                .insertInto('wallets')
                .values(fromWallet(wallet, userId))
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
    async getNetwork(networkId: string): Promise<Network> {
        this.assertConnected()

        const networks = await this.listNetworks()
        if (!networks) throw new Error('No networks available')

        const network = networks.find((n) => n.id === networkId)
        if (!network) throw new Error(`Network "${networkId}" not found`)
        return network
    }

    async getCurrentNetwork(): Promise<Network> {
        const session = await this.getSession()
        if (!session) {
            throw new Error('No session found')
        }
        const networkId = session.network
        if (!networkId) {
            throw new Error('No current network set in session')
        }

        const networks = await this.listNetworks()
        const network = networks.find((n) => n.id === networkId)
        if (!network) {
            throw new Error(`Network "${networkId}" not found`)
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
        const idps = await this.db.selectFrom('idps').selectAll().execute()
        const idpMap = new Map(idps.map((idp) => [idp.identityProviderId, idp]))
        return networks.map((table) =>
            toNetwork(table, idpMap.get(table.identityProviderId))
        )
    }

    async updateNetwork(network: Network): Promise<void> {
        const userId = this.assertConnected()
        // todo: check and compare userid of existing network
        await this.db.transaction().execute(async (trx) => {
            const networkEntry = fromNetwork(network, userId)
            this.logger.info(networkEntry, 'Updating network table')
            await trx
                .updateTable('networks')
                .set(networkEntry)
                .where('id', '=', network.id)
                .execute()

            const authEntry = fromAuth(network.auth)
            this.logger.info(authEntry, 'Updating auth table')
            await trx
                .updateTable('idps')
                .set(authEntry)
                .where(
                    'identityProviderId',
                    '=',
                    network.auth.identityProviderId
                )
                .execute()
        })
    }

    async addNetwork(network: Network): Promise<void> {
        const userId = this.authContext?.userId
        await this.db.transaction().execute(async (trx) => {
            const networkAlreadyExists = await trx
                .selectFrom('networks')
                .selectAll()
                .where('id', '=', network.id)
                .executeTakeFirst()
            if (networkAlreadyExists) {
                throw new Error(`Network ${network.id} already exists`)
            } else {
                await trx
                    .insertInto('idps')
                    .values(fromAuth(network.auth))
                    .execute()
                await trx
                    .insertInto('networks')
                    .values(fromNetwork(network, userId))
                    .execute()
            }
        })
    }

    async removeNetwork(networkId: string): Promise<void> {
        const userId = this.assertConnected()
        await this.db.transaction().execute(async (trx) => {
            const network = await trx
                .selectFrom('networks')
                .selectAll()
                .where('id', '=', networkId)
                .executeTakeFirst()
            if (!network) {
                throw new Error(`Network ${networkId} does not exists`)
            }
            if (network.userId !== userId) {
                throw new Error(
                    `Network ${networkId} is not owned by user ${userId}`
                )
            }
            await trx
                .deleteFrom('networks')
                .where('id', '=', networkId)
                .execute()
            await trx
                .deleteFrom('idps')
                .where('identityProviderId', '=', network.identityProviderId)
                .execute()
        })
    }

    // Transaction methods
    async setTransaction(transaction: Transaction): Promise<void> {
        const userId = this.assertConnected()

        const existing = await this.getTransaction(transaction.commandId)
        if (existing) {
            await this.db
                .updateTable('transactions')
                .set(fromTransaction(transaction, userId))
                .where('commandId', '=', transaction.commandId)
                .execute()
        } else {
            await this.db
                .insertInto('transactions')
                .values(fromTransaction(transaction, userId))
                .execute()
        }
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
        return transaction ? toTransaction(transaction) : undefined
    }
}

export const connection = (config: StoreConfig) => {
    switch (config.connection.type) {
        case 'sqlite':
            return new Kysely<DB>({
                dialect: new SqliteDialect({
                    database: new Database(config.connection.database),
                }),
                plugins: [new CamelCasePlugin()],
            })
        case 'memory':
            return new Kysely<DB>({
                dialect: new SqliteDialect({
                    database: new Database(':memory:'),
                }),
                plugins: [new CamelCasePlugin()],
            })
        default:
            throw new Error(
                `Unsupported database type: ${config.connection.type}`
            )
    }
}
