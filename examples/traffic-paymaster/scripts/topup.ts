// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Stands in for the off-ledger crediting service a wallet provider runs in
 * production (adapted from `wallet-sdk`'s own `TrafficScan` test double,
 * which is private to that package). `purchaseTraffic` only records what was
 * bought -- the traffic account lives on the participant, not the ledger --
 * so this follows the update stream for `TrafficPurchaser_PurchaseCredits`
 * exercises and applies each one with `topUpTraffic`. Runs until Ctrl+C.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LedgerProvider, localNetStaticConfig } from '@canton-network/wallet-sdk'
import type { Ops } from '@canton-network/core-provider-ledger'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'
import { TrafficPurchaser } from '@canton-network/core-traffic-purchase'
import type { TrafficPurchasedResult } from '@canton-network/core-traffic-purchase'
import { createAdminSdk, localNetAuth, type AdminSdk } from './lib.js'

const trafficPurchaserQualifiedName = TrafficPurchaser.templateId.slice(
    TrafficPurchaser.templateId.indexOf(':')
)
const purchaseCreditsChoice =
    TrafficPurchaser.TrafficPurchaser_PurchaseCredits.choiceName

async function readPaymasterParty(): Promise<string> {
    const here = path.dirname(fileURLToPath(import.meta.url))
    const envPath = path.join(here, '../.env.local')
    const contents = await fs.readFile(envPath, 'utf-8').catch(() => {
        throw new Error(`Missing ${envPath}. Run "pnpm initialize" first.`)
    })
    const match = /^VITE_PAYMASTER_PARTY_ID=(.+)$/m.exec(contents)
    if (!match) {
        throw new Error(`${envPath} has no VITE_PAYMASTER_PARTY_ID`)
    }
    return match[1].trim()
}

async function main() {
    const paymaster = await readPaymasterParty()
    const admin = await createAdminSdk()

    const ledger = new LedgerProvider({
        baseUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
        accessTokenProvider: new AuthTokenProvider(
            localNetAuth(localNetStaticConfig.LOCALNET_USER_ID),
            console
        ),
    })

    let offset = (
        await ledger.request<Ops.GetV2StateLedgerEnd>({
            method: 'ledgerApi',
            params: { resource: '/v2/state/ledger-end', requestMethod: 'get', query: {} },
        })
    ).offset ?? 0

    console.log(`Watching purchases for paymaster ${paymaster} from offset ${offset}`)

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
    if (typeof event !== 'object' || event === null || !('ExercisedEvent' in event)) {
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

    if (!exercised.templateId.endsWith(trafficPurchaserQualifiedName)) return
    if (exercised.choice !== purchaseCreditsChoice) return
    if (exercised.exerciseResult === undefined) return

    const result = exercised.exerciseResult as TrafficPurchasedResult
    const balanceDelta = Math.floor(Number(result.trafficAmount))
    const account = await admin.traffic.topUpTraffic({
        accountId: result.targetUser.accountId,
        balanceDelta,
        deduplicationId: result.requestId,
    })
    console.log(
        `Credited ${balanceDelta} bytes to ${result.targetUser.accountId} ` +
            `(request ${result.requestId}); balance is now ${account.balance}`
    )
}

main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
})
