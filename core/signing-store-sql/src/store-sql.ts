// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Logger } from 'pino'
import {
    AuthContext,
    UserId,
    AuthAware,
    assertConnected,
} from '@canton-network/core-wallet-auth'
import {
    SigningDriverStore,
    SigningKey,
    SigningTransaction,
    SigningDriverStatus,
    SigningDriverConfig,
} from '@canton-network/core-signing-lib'
import {
    CamelCasePlugin,
    Kysely,
    SqliteDialect,
    sql,
    PostgresDialect,
} from 'kysely'
import pg from 'pg'
import Database from 'better-sqlite3'
import {
    DB,
    fromSigningKey,
    toSigningKey,
    fromSigningTransaction,
    toSigningTransaction,
    fromSigningDriverConfig,
    toSigningDriverConfig,
    SigningKeyTable,
    StoreConfig,
} from './schema.js'

export class StoreSql implements SigningDriverStore, AuthAware<StoreSql> {
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

    // SigningDriverStore methods
    async getSigningKey(
        userId: string,
        keyId: string
    ): Promise<SigningKey | undefined> {
        const result = await this.db
            .selectFrom('signingKeys')
            .selectAll()
            .where('userId', '=', userId)
            .where('id', '=', keyId)
            .executeTakeFirst()

        return result ? toSigningKey(result) : undefined
    }

    async getSigningKeyByPublicKey(
        publicKey: string
    ): Promise<SigningKey | undefined> {
        const result = await this.db
            .selectFrom('signingKeys')
            .selectAll()
            .where('publicKey', '=', publicKey)
            .executeTakeFirst()
        return result ? toSigningKey(result) : undefined
    }

    async getSigningKeyByName(
        userId: string,
        name: string
    ): Promise<SigningKey | undefined> {
        const result = await this.db
            .selectFrom('signingKeys')
            .selectAll()
            .where('userId', '=', userId)
            .where('name', '=', name)
            .executeTakeFirst()
        return result ? toSigningKey(result) : undefined
    }

    async setSigningKey(userId: string, key: SigningKey): Promise<void> {
        const serialized = fromSigningKey(key, userId)

        console.log(
            'setSigningKey - serialized data:',
            JSON.stringify(serialized, null, 2)
        )
        console.log('setSigningKey - serialized types:', {
            id: typeof serialized.id,
            userId: typeof serialized.userId,
            name: typeof serialized.name,
            publicKey: typeof serialized.publicKey,
            privateKey: typeof serialized.privateKey,
            metadata: typeof serialized.metadata,
            createdAt: typeof serialized.createdAt,
            updatedAt: typeof serialized.updatedAt,
        })

        await this.db
            .insertInto('signingKeys')
            .values(serialized)
            .onConflict((oc) =>
                oc.columns(['userId', 'id']).doUpdateSet({
                    name: serialized.name,
                    publicKey: serialized.publicKey,
                    privateKey: serialized.privateKey,
                    metadata: serialized.metadata,
                    updatedAt: new Date().toISOString(),
                })
            )
            .execute()
    }

    async deleteSigningKey(userId: string, keyId: string): Promise<void> {
        await this.db
            .deleteFrom('signingKeys')
            .where('userId', '=', userId)
            .where('id', '=', keyId)
            .execute()
    }

    async listSigningKeys(userId: string): Promise<SigningKey[]> {
        const results = await this.db
            .selectFrom('signingKeys')
            .selectAll()
            .where('userId', '=', userId)
            .orderBy('createdAt', 'desc')
            .execute()

        return results.map((result: SigningKeyTable) => toSigningKey(result))
    }

    async getSigningTransaction(
        userId: string,
        txId: string
    ): Promise<SigningTransaction | undefined> {
        const result = await this.db
            .selectFrom('signingTransactions')
            .selectAll()
            .where('userId', '=', userId)
            .where('id', '=', txId)
            .executeTakeFirst()

        return result ? toSigningTransaction(result) : undefined
    }

    async setSigningTransaction(
        userId: string,
        transaction: SigningTransaction
    ): Promise<void> {
        const serialized = fromSigningTransaction(transaction, userId)

        await this.db
            .insertInto('signingTransactions')
            .values(serialized)
            .onConflict((oc) =>
                oc.columns(['userId', 'id']).doUpdateSet({
                    hash: serialized.hash,
                    signature: serialized.signature,
                    publicKey: serialized.publicKey,
                    status: serialized.status,
                    metadata: serialized.metadata,
                    signedAt: serialized.signedAt,
                    updatedAt: new Date().toISOString(),
                })
            )
            .execute()
    }

    async updateSigningTransactionStatus(
        userId: string,
        txId: string,
        status: SigningDriverStatus
    ): Promise<void> {
        // Get current transaction to check if it's already signed
        const current = await this.getSigningTransaction(userId, txId)

        const updateData: {
            status: string
            updatedAt: string
            signedAt?: string
        } = {
            status,
            updatedAt: new Date().toISOString(),
        }

        // Only set signedAt when transitioning to 'signed' if not already set
        // This preserves the audit trail of when it was originally signed
        if (status === 'signed' && !current?.signedAt) {
            updateData.signedAt = new Date().toISOString()
        }

        await this.db
            .updateTable('signingTransactions')
            .set(updateData)
            .where('userId', '=', userId)
            .where('id', '=', txId)
            .execute()
    }

    async listSigningTransactions(
        userId: string,
        limit: number = 100,
        before?: string
    ): Promise<SigningTransaction[]> {
        let query = this.db
            .selectFrom('signingTransactions')
            .selectAll()
            .where('userId', '=', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit)

        if (before) {
            const beforeTx = await this.getSigningTransaction(userId, before)
            if (beforeTx) {
                query = query.where(
                    'createdAt',
                    '<',
                    beforeTx.createdAt.toISOString()
                )
            }
        }

        const results = await query.execute()
        return results.map(toSigningTransaction)
    }

    async listSigningTransactionsByTxIdsAndPublicKeys(
        txIds: string[],
        publicKeys: string[]
    ): Promise<SigningTransaction[]> {
        const results = await this.db
            .selectFrom('signingTransactions')
            .selectAll()
            .where((eb) =>
                eb.or([
                    eb('publicKey', 'in', publicKeys),
                    eb('id', 'in', txIds),
                ])
            )
            .execute()

        return results.map(toSigningTransaction)
    }

    async getSigningDriverConfiguration(
        userId: string,
        driverId: string
    ): Promise<SigningDriverConfig | undefined> {
        const result = await this.db
            .selectFrom('signingDriverConfigs')
            .selectAll()
            .where('userId', '=', userId)
            .where('driverId', '=', driverId)
            .executeTakeFirst()

        return result ? toSigningDriverConfig(result) : undefined
    }

    async setSigningDriverConfiguration(
        userId: string,
        config: SigningDriverConfig
    ): Promise<void> {
        const serialized = fromSigningDriverConfig(config, userId)

        await this.db
            .insertInto('signingDriverConfigs')
            .values(serialized)
            .onConflict((oc) =>
                oc.columns(['userId', 'driverId']).doUpdateSet({
                    config: serialized.config,
                })
            )
            .execute()
    }

    async setSigningKeys(userId: string, keys: SigningKey[]): Promise<void> {
        if (keys.length === 0) return

        const serialized = keys.map((key) => fromSigningKey(key, userId))

        await this.db
            .insertInto('signingKeys')
            .values(serialized)
            .onConflict((oc) =>
                // on conflict preserve keys passed to that method
                oc.columns(['userId', 'id']).doUpdateSet({
                    name: sql`excluded.name`,
                    publicKey: sql`excluded.public_key`,
                    privateKey: sql`excluded.private_key`,
                    metadata: sql`excluded.metadata`,
                    updatedAt: new Date().toISOString(),
                })
            )
            .execute()
    }

    async setSigningTransactions(
        userId: string,
        transactions: SigningTransaction[]
    ): Promise<void> {
        if (transactions.length === 0) return

        const serialized = transactions.map((tx) =>
            fromSigningTransaction(tx, userId)
        )

        await this.db
            .insertInto('signingTransactions')
            .values(serialized)
            .onConflict((oc) =>
                // on conflict preserve transactions passed to that method
                oc.columns(['userId', 'id']).doUpdateSet({
                    hash: sql`excluded.hash`,
                    signature: sql`excluded.signature`,
                    publicKey: sql`excluded.public_key`,
                    status: sql`excluded.status`,
                    metadata: sql`excluded.metadata`,
                    signedAt: sql`excluded.signed_at`,
                    updatedAt: new Date().toISOString(),
                })
            )
            .execute()
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
                    pool: new pg.Pool({
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
