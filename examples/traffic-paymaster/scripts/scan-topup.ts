// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Stands in for the participant TEA that credits purchased traffic (adapted
 * from `wallet-sdk`'s own `TrafficScan` test double, which is private to that
 * package). `TrafficPurchaser_PurchaseCredits` credits the traffic on-ledger by
 * creating (and immediately archiving) a `TrafficCredit`; its created event is
 * in the transaction tree even though the contract is transient. This follows
 * the update stream for those created events and applies each with
 * `topUpTraffic`. Long-running: scans forever until Ctrl+C. For a one-off
 * manual credit instead, see `topup.ts`.
 */
import { LedgerProvider, localNetStaticConfig } from '@canton-network/wallet-sdk'
import type { Ops } from '@canton-network/core-provider-ledger'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'
import { TrafficCredit } from '@canton-network/core-traffic-purchase'
import { createAdminSdk, localNetAuth, type AdminSdk } from './lib.js'
import { requireEnvVar } from './env-file.js'

const trafficCreditQualifiedName = TrafficCredit.templateId.slice(
    TrafficCredit.templateId.indexOf(':')
)

async function main() {
    const paymaster = await requireEnvVar('VITE_PAYMASTER_PARTY_ID')
    const admin = await createAdminSdk()

    const ledger = new LedgerProvider({
        baseUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        accessTokenProvider: new AuthTokenProvider(
            localNetAuth(localNetStaticConfig.LOCALNET_USER_ID)
        ),
    })

    let offset = (
        await ledger.request<Ops.GetV2StateLedgerEnd>({
            method: 'ledgerApi',
            params: { resource: '/v2/state/ledger-end', requestMethod: 'get', query: {} },
        })
    ).offset ?? 0

    console.log(`Scanning purchases for paymaster ${paymaster} from offset ${offset}`)
    console.log('Leave this running. Ctrl+C to stop.')

    let stopped = false
    process.on('SIGINT', () => {
        stopped = true
    })

    while (!stopped) {
        const responses = await ledger.request<Ops.PostV2Updates>({
            method: 'ledgerApi',
            params: {
                resource: '/v2/updates',
                requestMethod: 'post',
                body: {
                    beginExclusive: offset,
                    updateFormat: {
                        includeTransactions: {
                            transactionShape: 'TRANSACTION_SHAPE_LEDGER_EFFECTS',
                            eventFormat: {
                                filtersByParty: { [paymaster]: {} },
                                verbose: true,
                            },
                        },
                    },
                },
                query: { limit: 100, stream_idle_timeout_ms: 1000 },
            },
        })

        for (const { update } of responses) {
            if (typeof update !== 'object' || update === null) continue
            if (!('Transaction' in update)) continue

            const transaction = (
                update as { Transaction: { value: { events: unknown[]; offset: number } } }
            ).Transaction.value
            for (const event of transaction.events) {
                await applyEvent(admin, event)
            }
            offset = transaction.offset
        }
    }
}

async function applyEvent(admin: AdminSdk, event: unknown): Promise<void> {
    if (typeof event !== 'object' || event === null || !('CreatedEvent' in event)) {
        return
    }
    const created = (
        event as {
            CreatedEvent: {
                templateId: string
                contractId: string
                createArgument?: unknown
            }
        }
    ).CreatedEvent

    if (!created.templateId.endsWith(trafficCreditQualifiedName)) return
    if (created.createArgument === undefined) return

    const credit = created.createArgument as TrafficCredit
    const accountId = credit.accountId.value
    const balanceDelta = Number(credit.amount)
    const account = await admin.traffic.topUpTraffic({
        accountId,
        balanceDelta,
        // The credit's own contract id: unique per credit, so re-seeing the
        // same created event cannot top the account up twice.
        deduplicationId: created.contractId,
    })
    console.log(
        `Credited ${balanceDelta} bytes to ${accountId} ` +
            `(credit ${created.contractId}); balance is now ${account.balance}`
    )
}

main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
})
