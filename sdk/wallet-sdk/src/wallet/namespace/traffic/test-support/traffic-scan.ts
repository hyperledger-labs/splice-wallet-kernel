// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Stands in for the off-ledger service a wallet provider runs in production.
 *
 * `TrafficAccountNamespace.purchaseTraffic` only records what was bought --
 * `TrafficPurchaser_PurchaseCredits` is exercised, and that is all: the traffic
 * account lives on the participant, not on the ledger, so applying the result
 * is a separate step that something has to take (see the class doc on
 * `purchaseTraffic`). This follows the participant's own update stream for
 * that choice's exercises and applies each one through `topUpTraffic`, which is
 * the smallest thing that does.
 *
 * It is test-grade on purpose: in-memory state and a poll loop, not a durable
 * subscription with a persisted offset and retries -- a real crediting service
 * would want both.
 */
import { pino } from 'pino'
import { LedgerProvider, type Ops } from '@canton-network/core-provider-ledger'
import {
    AuthTokenProvider,
    type TokenProviderConfig,
} from '@canton-network/core-wallet-auth'
import {
    TrafficPurchaser,
    type TrafficPurchasedResult,
} from '@canton-network/core-traffic-purchase'
import type { PartyId } from '@canton-network/core-types'
import type { TrafficAccountNamespace } from '../namespace.js'
import { wholeBytes } from '../pricing.js'

/** Everything from a template id's first colon on, so its package id does not matter. */
const trafficPurchaserQualifiedName = TrafficPurchaser.templateId.slice(
    TrafficPurchaser.templateId.indexOf(':')
)
const purchaseCreditsChoice =
    TrafficPurchaser.TrafficPurchaser_PurchaseCredits.choiceName

/** A purchase this scan credited, and what the account came to afterwards. */
export type TrafficCredit = {
    result: TrafficPurchasedResult
    /** Whole bytes credited, i.e. `result.trafficAmount` floored. */
    balanceDelta: number
    /** The account balance the participant reported after the credit. */
    balance: number
}

type Waiter = {
    resolve: (credit: TrafficCredit) => void
    reject: (error: unknown) => void
}

export class TrafficScan {
    private readonly ledger: LedgerProvider
    private readonly aborter = new AbortController()
    private readonly credited = new Map<string, TrafficCredit>()
    private readonly waiters = new Map<string, Waiter[]>()
    private offset: number
    private running: Promise<void> | undefined
    private failure: unknown

    private constructor(
        ledgerApiUrl: URL,
        auth: TokenProviderConfig,
        private readonly traffic: TrafficAccountNamespace,
        private readonly parties: PartyId[],
        beginExclusive: number
    ) {
        this.ledger = new LedgerProvider({
            baseUrl: ledgerApiUrl,
            accessTokenProvider: new AuthTokenProvider(
                auth,
                pino({ name: 'traffic-scan', level: 'silent' })
            ),
        })
        this.offset = beginExclusive
    }

    /**
     * Starts following the stream, from the participant's current ledger end
     * unless told otherwise: a purchase made before this starts is not this
     * scan's business.
     */
    static async start(options: {
        ledgerApiUrl: URL
        auth: TokenProviderConfig
        /** The base traffic namespace `topUpTraffic` is applied through. */
        traffic: TrafficAccountNamespace
        /** The parties to watch -- a purchase names a buyer and a paymaster. */
        parties: PartyId[]
        beginExclusive?: number
    }): Promise<TrafficScan> {
        const scan = new TrafficScan(
            options.ledgerApiUrl,
            options.auth,
            options.traffic,
            options.parties,
            options.beginExclusive ?? 0
        )
        if (options.beginExclusive === undefined) {
            scan.offset = await scan.ledgerEnd()
        }
        scan.running = scan.follow()
        return scan
    }

    /** Stops following, and waits for the poll in flight to come back. */
    async stop(): Promise<void> {
        this.aborter.abort()
        await this.running?.catch(() => undefined)
    }

    /**
     * Waits for the purchase `requestId` names to have been credited.
     *
     * Resolves once `topUpTraffic` has applied it, so the balance `getTraffic`
     * reports afterwards includes it. A purchase credited before this was
     * called resolves at once -- the outcome is kept, not just signalled.
     */
    async waitForCredit(
        requestId: string,
        timeoutMs = 60_000
    ): Promise<TrafficCredit> {
        const already = this.credited.get(requestId)
        if (already !== undefined) return already
        if (this.failure !== undefined) throw this.failure

        return new Promise<TrafficCredit>((resolve, reject) => {
            const timer = setTimeout(() => {
                this.forget(requestId, waiter)
                reject(
                    new Error(
                        `No traffic credit for request ${requestId} within ${timeoutMs}ms`
                    )
                )
            }, timeoutMs)
            timer.unref?.()

            const waiter: Waiter = {
                resolve: (credit) => {
                    clearTimeout(timer)
                    resolve(credit)
                },
                reject: (error) => {
                    clearTimeout(timer)
                    reject(error)
                },
            }
            this.waiters.set(requestId, [
                ...(this.waiters.get(requestId) ?? []),
                waiter,
            ])
        })
    }

    private async ledgerEnd(): Promise<number> {
        return (
            (
                await this.ledger.request<Ops.GetV2StateLedgerEnd>({
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/state/ledger-end',
                        requestMethod: 'get',
                        query: {},
                    },
                })
            ).offset ?? 0
        )
    }

    /** Polls until stopped. The loop is the whole component. */
    private async follow(): Promise<void> {
        while (!this.aborter.signal.aborted) {
            let responses: Array<{ update?: unknown }>
            try {
                responses = await this.ledger.request<Ops.PostV2Updates>({
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/updates',
                        requestMethod: 'post',
                        body: {
                            beginExclusive: this.offset,
                            updateFormat: {
                                includeTransactions: {
                                    transactionShape:
                                        'TRANSACTION_SHAPE_LEDGER_EFFECTS',
                                    eventFormat: {
                                        filtersByParty: Object.fromEntries(
                                            this.parties.map((party) => [
                                                party,
                                                {},
                                            ])
                                        ),
                                        verbose: true,
                                    },
                                },
                            },
                        },
                        query: { limit: 100, stream_idle_timeout_ms: 500 },
                    },
                })
            } catch (error) {
                if (this.aborter.signal.aborted) return
                this.fail(error)
                return
            }

            for (const { update } of responses) {
                if (this.aborter.signal.aborted) return
                await this.apply(update)
            }
        }
    }

    /** Credits every matching exercise in one update, and advances past it. */
    private async apply(update: unknown): Promise<void> {
        if (typeof update !== 'object' || update === null) return

        if (!('Transaction' in update)) {
            this.offset = offsetOf(update) ?? this.offset
            return
        }

        const transaction = (
            update as {
                Transaction: { value: { events: unknown[]; offset: number } }
            }
        ).Transaction.value
        for (const event of transaction.events) {
            await this.applyEvent(event)
        }
        this.offset = transaction.offset
    }

    private async applyEvent(event: unknown): Promise<void> {
        if (
            typeof event !== 'object' ||
            event === null ||
            !('ExercisedEvent' in event)
        ) {
            return
        }

        const exercised = (
            event as {
                ExercisedEvent: {
                    templateId: string
                    choice: string
                    exerciseResult?: unknown
                }
            }
        ).ExercisedEvent

        if (!exercised.templateId.endsWith(trafficPurchaserQualifiedName)) {
            return
        }
        if (exercised.choice !== purchaseCreditsChoice) return
        if (exercised.exerciseResult === undefined) return

        const result = exercised.exerciseResult as TrafficPurchasedResult
        const balanceDelta = Number(wholeBytes(result.trafficAmount))
        const account = await this.traffic.topUpTraffic({
            accountId: result.targetUser.accountId,
            balanceDelta,
            deduplicationId: result.requestId,
        })

        const credit: TrafficCredit = {
            result,
            balanceDelta,
            balance: account.balance,
        }
        this.credited.set(result.requestId, credit)
        this.settle(result.requestId, credit)
    }

    private settle(requestId: string, credit: TrafficCredit): void {
        const waiting = this.waiters.get(requestId)
        if (waiting === undefined) return
        this.waiters.delete(requestId)
        for (const waiter of waiting) waiter.resolve(credit)
    }

    private forget(requestId: string, waiter: Waiter): void {
        const waiting = this.waiters.get(requestId)
        if (waiting === undefined) return
        const rest = waiting.filter((candidate) => candidate !== waiter)
        if (rest.length === 0) this.waiters.delete(requestId)
        else this.waiters.set(requestId, rest)
    }

    /** The loop is done for: nothing further is going to be credited. */
    private fail(error: unknown): void {
        this.failure = error
        for (const [requestId, waiting] of this.waiters) {
            for (const waiter of waiting) waiter.reject(error)
            this.waiters.delete(requestId)
        }
    }
}

/** The offset of an `Update` that is not a `Transaction`. */
function offsetOf(update: object): number | undefined {
    if ('OffsetCheckpoint' in update) {
        return (
            update as { OffsetCheckpoint: { value: { offset: number } } }
        ).OffsetCheckpoint.value.offset
    }
    if ('Reassignment' in update) {
        return (update as { Reassignment: { value: { offset: number } } })
            .Reassignment.value.offset
    }
    if ('TopologyTransaction' in update) {
        return (
            update as { TopologyTransaction: { value: { offset: number } } }
        ).TopologyTransaction.value.offset
    }
    return undefined
}
