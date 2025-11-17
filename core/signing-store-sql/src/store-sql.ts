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
    SigningDriverStore,
    SigningKey,
    SigningTransaction,
    SigningDriverStatus,
    SigningDriverConfig,
} from '@canton-network/core-signing-lib'
import { CamelCasePlugin, Kysely, SqliteDialect } from 'kysely'
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
        await this.db
            .updateTable('signingTransactions')
            .set({ status, updatedAt: new Date().toISOString() })
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
                oc.columns(['userId', 'id']).doUpdateSet({
                    name: serialized[0].name,
                    publicKey: serialized[0].publicKey,
                    privateKey: serialized[0].privateKey,
                    metadata: serialized[0].metadata,
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
                oc.columns(['userId', 'id']).doUpdateSet({
                    hash: serialized[0].hash,
                    signature: serialized[0].signature,
                    publicKey: serialized[0].publicKey,
                    status: serialized[0].status,
                    metadata: serialized[0].metadata,
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
