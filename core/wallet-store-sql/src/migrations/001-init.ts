import { Kysely } from 'kysely'
import { DB } from '../schema.js'

export async function up(db: Kysely<DB>): Promise<void> {
    console.log('Running initial migration...')

    // --- idps ---
    await db.schema
        .createTable('idps')
        .ifNotExists()
        .addColumn('identity_provider_id', 'text', (col) => col.primaryKey())
        .addColumn('type', 'text', (col) => col.notNull())
        .addColumn('issuer', 'text', (col) => col.notNull())
        .addColumn('config_url', 'text', (col) => col.notNull())
        .addColumn('audience', 'text', (col) => col.notNull())
        .addColumn('token_url', 'text')
        .addColumn('grant_type', 'text')
        .addColumn('scope', 'text', (col) => col.notNull())
        .addColumn('client_id', 'text', (col) => col.notNull())
        .addColumn('client_secret', 'text')
        .addColumn('admin_client_id', 'text')
        .addColumn('admin_client_secret', 'text')
        .execute()

    // --- networks ---
    await db.schema
        .createTable('networks')
        .ifNotExists()
        .addColumn('chain_id', 'text', (col) => col.primaryKey())
        .addColumn('name', 'text', (col) => col.notNull())
        .addColumn('synchronizer_id', 'text', (col) => col.notNull())
        .addColumn('description', 'text')
        .addColumn('ledger_api_base_url', 'text', (col) => col.notNull())
        .addColumn('ledger_api_admin_grpc_url', 'text', (col) => col.notNull())
        .addColumn('user_id', 'text') // optional/global if null
        .addColumn('identity_provider_id', 'text', (col) =>
            col.references('idps.identity_provider_id').onDelete('cascade')
        )
        .execute()

    // --- wallets ---
    await db.schema
        .createTable('wallets')
        .ifNotExists()
        .addColumn('party_id', 'text', (col) => col.primaryKey())
        .addColumn('primary', 'boolean', (col) =>
            col.notNull().defaultTo(false)
        )
        .addColumn('hint', 'text', (col) => col.notNull())
        .addColumn('public_key', 'text', (col) => col.notNull())
        .addColumn('namespace', 'text', (col) => col.notNull())
        .addColumn('user_id', 'text', (col) => col.notNull())
        .addColumn('chain_id', 'text', (col) =>
            col.references('networks.chain_id').onDelete('cascade')
        )
        .addColumn('signing_provider_id', 'text', (col) => col.notNull())
        .execute()

    // --- transactions ---
    await db.schema
        .createTable('transactions')
        .ifNotExists()
        .addColumn('command_id', 'text', (col) => col.primaryKey())
        .addColumn('status', 'text', (col) => col.notNull())
        .addColumn('prepared_transaction', 'text', (col) => col.notNull())
        .addColumn('prepared_transaction_hash', 'text', (col) => col.notNull())
        .addColumn('payload', 'text')
        .addColumn('user_id', 'text', (col) => col.notNull())
        .execute()

    // --- sessions ---
    await db.schema
        .createTable('sessions')
        .ifNotExists()
        .addColumn('network', 'text', (col) => col.notNull())
        .addColumn('access_token', 'text', (col) => col.notNull())
        .addColumn('user_id', 'text', (col) => col.notNull())
        .execute()
}

export async function down(db: Kysely<DB>): Promise<void> {
    await db.schema.dropTable('transactions').ifExists().execute()
    await db.schema.dropTable('sessions').ifExists().execute()
    await db.schema.dropTable('wallets').ifExists().execute()
    await db.schema.dropTable('networks').ifExists().execute()
    await db.schema.dropTable('idps').ifExists().execute()
}
