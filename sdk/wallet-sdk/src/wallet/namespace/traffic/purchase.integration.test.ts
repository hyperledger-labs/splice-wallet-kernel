// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { packageId } from '@canton-network/core-traffic-purchase'
import { SDK } from '../../sdk.js'
import { localNetStaticConfig } from '../../../config.js'
import { localNetAuth } from './test-support/localnet-auth.js'
import { TrafficScan } from './test-support/traffic-scan.js'

/**
 * The full round trip a wallet provider sets `traffic` up for, against a real
 * splice LocalNet (`pnpm run start:localnet` from the repo root; it needs to be
 * running with the traffic-enforcement config `scripts/src/start-localnet.ts`
 * adds for the app-user participant, and `pnpm generate:traffic-purchase` run
 * once so the model's DAR and bindings exist on disk):
 *
 *  1. `traffic.setup` converges a paymaster onto selling traffic for Amulet.
 *  2. `traffic.purchaseTraffic` buys traffic for a user account, paid for by an
 *     external party signing for itself.
 *  3. A `TrafficScan` -- standing in for the off-ledger service a wallet
 *     provider runs -- notices the purchase on the participant's own update
 *     stream and applies it to the account with `topUpTraffic`, since
 *     `purchaseTraffic` only records what was bought and does not credit
 *     anything (see `TrafficAccountNamespace.purchaseTraffic`).
 *  4. `traffic.getTraffic` reads the balance back, independently of what the
 *     scan reported, to confirm it is the participant's own account that moved.
 */
describe('traffic.setup and traffic.purchaseTraffic on LocalNet', () => {
    it('buys traffic for a user account, and the scan tops the balance up', async () => {
        const auth = localNetAuth(localNetStaticConfig.LOCALNET_USER_ID)

        const admin = await SDK.create({
            auth,
            ledgerClientUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
            amulet: {
                scanApiUrl: localNetStaticConfig.LOCALNET_SCAN_API_URL,
                registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
                auth,
            },
            asset: {
                registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
                auth,
            },
            traffic: {
                registries: [localNetStaticConfig.LOCALNET_REGISTRY_API_URL],
                auth,
            },
        })

        const darBytes = await fs.readFile(await trafficPurchaseDarPath())
        await admin.ledger.dar.upload(darBytes, packageId)

        const amulet = await admin.asset.find(
            'Amulet',
            localNetStaticConfig.LOCALNET_REGISTRY_API_URL
        )

        const suffix = randomUUID().slice(0, 8)
        const bytesPerAmulet = '1048576' // a mebibyte of traffic per Amulet

        // 1. Set a paymaster up to sell traffic for Amulet. A paymaster is a
        // participant-hosted party, so its setup is submitted directly rather
        // than through the interactive-submission flow an external party needs.
        const paymaster = await admin.party.internal.allocate({
            partyHint: `traffic_paymaster_${suffix}`,
        })

        const setup = await admin.traffic.setup({
            paymaster,
            conversionRates: [
                { instrumentId: amulet, conversionRate: bytesPerAmulet },
            ],
        })
        if (setup.commands.length > 0) {
            await admin.ledger.internal.submit({
                commands: setup.commands,
                actAs: [paymaster],
            })
        }

        // Nothing was there before this call, so its own commands created both
        // contracts and their ids are not known until they commit.
        const active = await admin.traffic.readTrafficSetup(paymaster)
        const trafficPurchaserCid = active.trafficPurchasers[0]?.contractId
        const conversionRateCid = active.conversionRates[0]?.contractId
        if (
            trafficPurchaserCid === undefined ||
            conversionRateCid === undefined
        ) {
            throw new Error(
                `Traffic setup for paymaster ${paymaster} did not produce a purchaser and a rate`
            )
        }
        const setupDisclosures = await admin.ledger.disclose({
            contractIds: [trafficPurchaserCid, conversionRateCid],
            asParty: paymaster,
        })

        // Amulet refuses to settle a direct transfer to a party that has not
        // pre-approved one, so the paymaster needs one before it can be paid.
        const preapprovalCommand = await admin.amulet.preapproval.command.create(
            { parties: { receiver: paymaster } }
        )
        await admin.ledger.internal.submit({
            commands: [preapprovalCommand],
            actAs: [paymaster],
        })
        await admin.amulet.preapproval.fetchStatus(paymaster)

        // The buyer: an external party, since a purchase's execute step needs
        // partySignatures -- a locally hosted party has no key of its own to
        // sign one with.
        const buyerKeys = admin.keys.generate()
        const buyer = await admin.party.external
            .create(buyerKeys.publicKey, { partyHint: `traffic_buyer_${suffix}` })
            .sign(buyerKeys.privateKey)
            .execute()

        const [tapCommand, tapDisclosedContracts] = await admin.amulet.tap(
            buyer.partyId,
            '10'
        )
        await admin.ledger
            .prepare({
                partyId: buyer.partyId,
                commands: tapCommand,
                disclosedContracts: tapDisclosedContracts,
            })
            .sign(buyerKeys.privateKey)
            .execute({ partyId: buyer.partyId })

        // 3. The scan: started before the purchase, so it is following the
        // stream by the time the purchase's transaction commits.
        const scan = await TrafficScan.start({
            ledgerApiUrl: localNetStaticConfig.LOCALNET_APP_USER_LEDGER_URL,
            auth,
            traffic: admin.traffic,
            parties: [paymaster, buyer.partyId],
        })

        try {
            // 2. Buy two mebibytes of traffic for the buyer's own account, paid
            // for in Amulet at the rate the setup just priced it at.
            const requestId = `req-${suffix}`
            const trafficAmount = '2097152'

            const [purchaseCommand, purchaseDisclosedContracts] =
                await admin.traffic.purchaseTraffic({
                    purchaser: buyer.partyId,
                    trafficPurchaserCid,
                    conversionRateCid,
                    paymasterReceiver: paymaster,
                    instrumentId: 'Amulet',
                    registryUrl: localNetStaticConfig.LOCALNET_REGISTRY_API_URL,
                    targetUser: { accountId: buyer.partyId },
                    requestId,
                    trafficAmount,
                    conversionRate: bytesPerAmulet,
                    disclosedContracts: setupDisclosures,
                })

            await admin.ledger
                .prepare({
                    partyId: buyer.partyId,
                    commands: purchaseCommand,
                    disclosedContracts: purchaseDisclosedContracts,
                })
                .sign(buyerKeys.privateKey)
                .execute({ partyId: buyer.partyId })

            // 3. Wait for the scan to have applied the credit...
            const credit = await scan.waitForCredit(requestId)
            expect(credit.balanceDelta).toBe(2_097_152)

            // 4. ...and confirm it against the participant's own account,
            // independently of what the scan reported.
            await expect(admin.traffic.getTraffic(buyer.partyId)).resolves.toEqual(
                { accountId: buyer.partyId, balance: credit.balance }
            )
        } finally {
            await scan.stop()
        }
    })
})

/**
 * `damljs/traffic-purchase-models/.daml/dist/traffic-purchase-models-1.0.0.dar`,
 * which `pnpm generate:traffic-purchase` builds. Gitignored, like the rest of
 * the Daml layer's output -- run that once before this test if it is missing.
 */
async function trafficPurchaseDarPath(): Promise<string> {
    const here = path.dirname(fileURLToPath(import.meta.url))
    const darPath = path.join(
        here,
        '../../../../../../damljs/traffic-purchase-models/.daml/dist/traffic-purchase-models-1.0.0.dar'
    )
    try {
        await fs.access(darPath)
    } catch {
        throw new Error(
            `Missing ${darPath}. Run "pnpm generate:traffic-purchase" from the repo root first.`
        )
    }
    return darPath
}
