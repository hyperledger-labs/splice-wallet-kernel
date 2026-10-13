// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Logger } from 'pino'
import type { AuthAware } from '@canton-network/core-wallet-auth'
import type {
    Store,
    Transaction,
    Wallet,
} from '@canton-network/core-wallet-store'
import { resolveAutomationRunContext } from './service-account-session.js'
import {
    TransactionService,
    type HASHING_SCHEME_VERSION,
    type NotificationService,
    type SigningDrivers,
} from '@canton-network/core-wallet-services'

export type { AccessTokenProviderFactory } from './service-account-session.js'

/** Configuration for {@link SigningWorker}. */
export interface SigningWorkerOptions {
    /** Poll interval in ms (`server.signingWorker.pollInterval`, default 5000). */
    intervalMs: number
    signingDrivers: SigningDrivers
    store: Store & AuthAware<Store>
    notificationService: NotificationService
    logger: Logger
    hashingSchemeVersion: HASHING_SCHEME_VERSION
}

/**
 * Background poller that completes service-account transactions stuck in external
 * custody approval.
 *
 * ## When this runs
 *
 * During M2M automation (`prepareExecute` → `signAndExecute`), external signing
 * providers (Fireblocks, Blockdaemon, Dfns) may return `pending` instead of a
 * signature. The gateway persists the transaction with `status: 'pending'` and `status: 'awaiting-signature'` and
 * an `externalTxId` from the provider. This worker picks up those rows on each
 * tick via {@link Store.listAllPendingTransactions} (rows with an
 * `externalTxId` are processed; others are skipped).
 *
 * Participant and wallet-kernel sign synchronously and never appear here.
 *
 * ## What happens on each tick
 *
 * For every pending row the worker resolves an M2M auth context
 * ({@link resolveAutomationRunContext}), loads the user's primary wallet, and
 * calls {@link TransactionService.signAndExecute}.
 *
 * Although the worker always invokes `signAndExecute`, **retries do not submit a
 * new sign request**. `signAndExecute`branches on the stored transaction's status
 *
 * - **First pass** ( `pending`, no `externalTxId`): calls `sign()` which submits to singing provider
 *  via `driver.signTransaction()` and stores the returned `externalTxId` with status `awaiting-signature`
 * - **Subsequent ticks** (`awaiting-signature` with `externalTxId` present): `refreshTransaction()`
 *  which polls the existing requst via `driver.getTransaction()` and updated the stored status
 *
 *  `sign()` initiates only and will throw for a transaction that already has an `externalTxId`
 *
 * `signAndExecute` then:
 *
 * - returns `{status: pending}` while provider still reports the request as awaiting approval
 *   (worker logs and waits for the next tick), or
 * - calls `execute()` once provider reports `signed`. The signature is re-fetched from provider at
 *   execution time rather than carried from the signing step.
 *
 * A transaction is re-read before processing so a concurrent DApp call or an
 * earlier tick that already completed it is skipped.
 *
 * Rows that reach `failed` (rejected by provider or by the ledger) are not retried and `failureReason` records why
 *
 * ## Lifecycle
 *
 * Started once at gateway init (`start()`). Ticks are serialized: if a tick is
 * still running, the next interval callback is a no-op. Use `stop()` on shutdown.
 */
export class SigningWorker {
    private timer: ReturnType<typeof setInterval> | undefined
    private running = false

    constructor(private readonly options: SigningWorkerOptions) {}

    /** Starts the interval timer. Idempotent if already started. */
    start(): void {
        this.options.logger.info('Starting signing worker')
        if (this.timer) {
            return
        }
        this.timer = setInterval(() => {
            void this.tick()
        }, this.options.intervalMs)
        this.options.logger.info(
            { intervalMs: this.options.intervalMs },
            'Signing worker started'
        )
    }

    /** Clears the interval timer. */
    stop(): void {
        if (this.timer) {
            clearInterval(this.timer)
            this.timer = undefined
        }
    }

    /**
     * One poll cycle: list all pending transactions and attempt to complete
     * external-custody rows via {@link processPending}. Safe to call directly in
     * tests.
     */
    async tick(): Promise<void> {
        this.options.logger.trace(`Signing worker: executing a tick`)

        if (this.running) {
            return
        }
        this.running = true
        try {
            const pending =
                await this.options.store.listAllPendingTransactions()
            for (const tx of pending) {
                if (!tx.externalTxId) {
                    continue
                }
                await this.processPending(tx)
            }
        } catch (error) {
            this.options.logger.error(
                { err: error },
                'Signing worker tick failed'
            )
        } finally {
            this.running = false
        }
    }

    /**
     * Drives a single pending transaction through `signAndExecute`. Skips when
     * automation context, submitting wallet, or refreshed `pending` status is missing.
     * Errors are logged per transaction; other rows in the same tick still run.
     */
    private async processPending(transaction: Transaction): Promise<void> {
        const logger = this.options.logger
        const { userId, networkId, externalTxId } = transaction

        if (!externalTxId || !userId || !networkId) {
            logger.debug(
                { transaction },
                'Skipping signing worker tick: missing required fields'
            )
            return
        }

        const runContext = await resolveAutomationRunContext(
            this.options.store,
            userId,
            networkId,
            logger
        )

        if (!runContext) {
            logger.debug(
                { runContext, transactionId: transaction.id },
                'Skipping signing worker tick: no run context'
            )
            return
        }

        const store = runContext.scopedStore
        const wallet = await resolveWalletFromTransaction(
            transaction,
            store,
            logger
        )
        if (!wallet) {
            logger.warn(
                {
                    userId,
                    networkId,
                    transactionId: transaction.id,
                    commandId: transaction.commandId,
                },
                'Skipping signing worker tick: could not deduce submitting wallet from transaction payload'
            )
            return
        }

        const refreshedTx = await store.getTransaction(transaction.id)

        if (
            !refreshedTx ||
            (refreshedTx.status !== 'pending' &&
                refreshedTx.status !== 'awaiting-signature')
        ) {
            logger.debug(
                { refreshedTx },
                'Skipping signing worker tick: transaction no longer pending'
            )
            return
        }

        const session = await store.getSession(
            runContext.authContext.accessToken
        )

        if (!session) {
            logger.error(
                { userId, networkId, transactionId: transaction.id },
                'Signing worker tick failed: session not found'
            )
            return
        }

        const notifier = this.options.notificationService.getNotifier(
            session.id
        )

        const transactionLogger = this.options.logger.child({
            component: 'TransactionService',
        })

        const transactionService = new TransactionService(
            store,
            transactionLogger,
            this.options.signingDrivers,
            notifier,
            this.options.hashingSchemeVersion
        )

        try {
            const result = await transactionService.signAndExecute(
                runContext.authContext,
                runContext.network,
                wallet,
                refreshedTx
            )
            if ('status' in result && result.status === 'pending') {
                logger.info(
                    {
                        userId,
                        networkId,
                        transactionId: transaction.id,
                        commandId: transaction.commandId,
                        externalTxId: result.externalTxId,
                        signingProviderId: wallet.signingProviderId,
                    },
                    'Signing worker: transaction still awaiting external signing'
                )
            } else {
                logger.info(
                    {
                        userId,
                        networkId,
                        transactionId: transaction.id,
                        commandId: transaction.commandId,
                        externalTxId: transaction.externalTxId,
                        partyId: wallet.partyId,
                        signingProviderId: wallet.signingProviderId,
                        result,
                    },
                    'Signing worker completed service account transaction'
                )
            }
        } catch (error) {
            logger.error(
                {
                    err: error,
                    userId,
                    networkId,
                    transactionId: transaction.id,
                    commandId: transaction.commandId,
                    externalTxId: transaction.externalTxId,
                    partyId: wallet.partyId,
                    signingProviderId: wallet.signingProviderId,
                },
                'Signing worker failed to complete service account transaction'
            )
        }
    }
}

/**
 * Given the transaction, attempt to resolve the original wallet that submitted it.
 * It's not guaranteed that the primary wallet was used, so we check the `actAs` field in the payload and find a wallet with a matching party ID.
 *
 * Returns `undefined` if the wallet cannot be resolved.
 */
async function resolveWalletFromTransaction(
    tx: Transaction,
    store: Store,
    logger: Logger
): Promise<Wallet | undefined> {
    logger.debug({ tx, store }, 'Resolving wallet from transaction payload')

    // first see if we can determine the wallet from the payload's actAs field.
    // If not, we will default to the primary wallet.
    let wallet = undefined

    const payload = tx.payload
    if (payload && typeof payload === 'object') {
        const actAs = (payload as { actAs?: unknown }).actAs

        if (Array.isArray(actAs) && actAs.length !== 0) {
            if (actAs.length > 1) {
                logger.warn(
                    { actAs },
                    'Transaction has multiple acting parties; using the first one to resolve wallet'
                )
            }

            const partyId = actAs[0]
            const wallets = await store.getAllWallets()
            wallet = wallets.find((wallet) => wallet.partyId === partyId)
        }
    }

    if (!wallet) {
        // No actAs was given: lets default to the primary party.
        wallet = await store.getPrimaryWallet()
        logger.debug(
            { wallet, tx },
            'Transaction has no actAs; using primary wallet'
        )
    }

    return wallet
}
