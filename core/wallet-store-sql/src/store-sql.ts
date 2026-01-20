// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from 'pino'
import {
    AuthContext,
    UserId,
    AuthAware,
    assertConnected,
    Idp,
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
    UpdateWallet,
} from '@canton-network/core-wallet-store'
import { CamelCasePlugin, Kysely, PostgresDialect, SqliteDialect } from 'kysely'
import Database from 'better-sqlite3'
import {
    DB,
    fromIdp,
    fromNetwork,
    fromTransaction,
    fromWallet,
    toIdp,
    toNetwork,
    toTransaction,
    toWallet,
} from './schema.js'
import { Pool } from 'pg'

export class StoreSql implements BaseStore, AuthAware<StoreSql> {
    authContext: AuthContext | undefined

    constructor(
        private db: Kysely<DB>,
        private logger: Logger,
        authContext?: AuthContext
    ) {
        this.logger = logger.child({ component: 'StoreSql' })
        this.authContext = authContext
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
            .map((table) =>
                toWallet({
                    primary: table.primary,
                    partyId: table.partyId,
                    hint: table.hint,
                    publicKey: table.publicKey,
                    namespace: table.namespace,
                    networkId: table.networkId,
                    signingProviderId: table.signingProviderId,
                    userId: table.userId,
                    externalTxId: table.externalTxId ?? '',
                    topologyTransactions: table.topologyTransactions ?? '',
                    status: table.status ?? '',
                    disabled: table.disabled ?? 0,
                    ...(table.reason !== undefined && {
                        reason: table.reason,
                    }),
                })
            )
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

    async updateWallet({
        status,
        partyId,
        externalTxId,
    }: UpdateWallet): Promise<void> {
        this.logger.info('Updating wallet')

        await this.db.transaction().execute(async (trx) => {
            await trx
                .updateTable('wallets')
                .set({ status, externalTxId })
                .where('partyId', '=', partyId)
                .execute()
        })
    }

    async removeWallet(partyId: PartyId): Promise<void> {
        this.logger.info('Removing wallet')

        await this.db.transaction().execute(async (trx) => {
            await trx
                .deleteFrom('wallets')
                .where('partyId', '=', partyId)
                .execute()
        })
    }

    // Session methods
    async getSession(): Promise<Session | undefined> {
        const userId = this.assertConnected()
        const sessions = await this.db
            .selectFrom('sessions')
            .selectAll()
            .where('userId', '=', userId)
            .executeTakeFirst()
        return sessions
    }

    async setSession(session: Session): Promise<void> {
        const userId = this.assertConnected()
        await this.db.transaction().execute(async (trx) => {
            const deleted = await trx
                .deleteFrom('sessions')
                .where('userId', '=', userId)
                .execute()
            this.logger.debug(deleted, 'Deleted old session')
            const inserted = await trx
                .insertInto('sessions')
                .values({ ...session, userId })
                .execute()
            this.logger.debug(inserted, 'Inserted new session')
        })
    }

    async removeSession(): Promise<void> {
        const userId = this.assertConnected()
        await this.db
            .deleteFrom('sessions')
            .where('userId', '=', userId)
            .execute()
    }

    // IDP methods

    async getIdp(idpId: string): Promise<Idp> {
        this.assertConnected()

        const idps = await this.listIdps()
        if (!idps) throw new Error('No IDPs available')

        const idp = idps.find((n) => n.id === idpId)
        if (!idp) throw new Error(`IDP "${idpId}" not found`)
        return idp
    }

    async listIdps(): Promise<Array<Idp>> {
        // All IDPs are global for now -- TO-DO: user-specific IDPs
        const query = this.db.selectFrom('idps').selectAll()

        const idps = await query.execute()
        return idps.map((table) => toIdp(table))
    }

    async updateIdp(idp: Idp): Promise<void> {
        // todo: check and compare userid of existing idp
        await this.db.transaction().execute(async (trx) => {
            const idpEntry = fromIdp(idp)
            this.logger.info(idpEntry, 'Updating idp table')
            await trx
                .updateTable('idps')
                .set(idpEntry)
                .where('id', '=', idp.id)
                .execute()
        })
    }

    async addIdp(idp: Idp): Promise<void> {
        await this.db.transaction().execute(async (trx) => {
            const idpAlreadyExists = await trx
                .selectFrom('idps')
                .selectAll()
                .where('id', '=', idp.id)
                .executeTakeFirst()
            if (idpAlreadyExists) {
                throw new Error(`IDP ${idp.id} already exists`)
            } else {
                await trx.insertInto('idps').values(fromIdp(idp)).execute()
            }
        })
    }

    async removeIdp(idpId: string): Promise<void> {
        const networks = await this.listNetworks()
        if (networks.some((n) => n.identityProviderId === idpId)) {
            throw new Error(
                `Cannot delete IDP ${idpId} as it is in use by existing networks`
            )
        }

        await this.db.transaction().execute(async (trx) => {
            const idp = await trx
                .selectFrom('idps')
                .selectAll()
                .where('id', '=', idpId)
                .executeTakeFirst()
            if (!idp) {
                throw new Error(`IDP ${idpId} does not exists`)
            }
            await trx.deleteFrom('idps').where('id', '=', idpId).execute()
        })
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
        return networks.map((table) => toNetwork(table))
    }

    async updateNetwork(network: Network): Promise<void> {
        // todo: check and compare idpId of existing network
        this.assertConnected()
        await this.db.transaction().execute(async (trx) => {
            // we do not set a userId for now and leave all networks global when updating
            const networkEntry = fromNetwork(network, undefined)
            this.logger.info(networkEntry, 'Updating network table')
            await trx
                .updateTable('networks')
                .set(networkEntry)
                .where('id', '=', network.id)
                .execute()
        })
    }

    async addNetwork(network: Network): Promise<void> {
        const userId = this.authContext?.userId
        const idps = await this.listIdps()
        const networkIdp = idps.find(
            (idp) => idp.id === network.identityProviderId
        )

        if (!networkIdp) {
            throw new Error(
                `Identity provider "${network.identityProviderId}" not found`
            )
        }

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

    async listTransactions(): Promise<Array<Transaction>> {
        const userId = this.assertConnected()
        const transactions = await this.db
            .selectFrom('transactions')
            .selectAll()
            .where('userId', '=', userId)
            .execute()
        return transactions.map((table) => toTransaction(table))
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
        case 'postgres':
            return new Kysely<DB>({
                dialect: new PostgresDialect({
                    pool: new Pool({
                        database: config.connection.database,
                        user: config.connection.user,
                        password: config.connection.password,
                        port: config.connection.port,
                        host: config.connection.host,
                    }),
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
    }
}
