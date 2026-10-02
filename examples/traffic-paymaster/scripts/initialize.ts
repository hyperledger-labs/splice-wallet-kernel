// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * One-time paymaster setup against a real splice LocalNet (`pnpm start:localnet`
 * from the repo root, with traffic-enforcement enabled; `pnpm generate:traffic-purchase`
 * run once so the model's DAR and bindings exist on disk), then stays running to
 * serve the paymaster's off-ledger API the UI's purchase needs.
 *
 * Writes `.env.local` with the paymaster's party id and API URL so both the
 * `dev` UI and the `topup` script pick them up without manual copy-pasting.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { packageId } from '@canton-network/core-traffic-purchase'
import { localNetStaticConfig } from '@canton-network/wallet-sdk'
import { BYTES_PER_AMULET, createAdminSdk } from './lib.js'
import { PaymasterApi } from './paymaster-api.js'

const here = path.dirname(fileURLToPath(import.meta.url))

async function trafficPurchaseDarPath(): Promise<string> {
    const darPath = path.join(
        here,
        '../../../damljs/traffic-purchase-models/.daml/dist/traffic-purchase-models-1.0.0.dar'
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

async function main() {
    const admin = await createAdminSdk()

    console.log('Uploading the traffic-purchase-models DAR...')
    const darBytes = await fs.readFile(await trafficPurchaseDarPath())
    await admin.ledger.dar.upload(darBytes, packageId)

    const amuletAsset = await admin.asset.find(
        'Amulet',
        localNetStaticConfig.LOCALNET_REGISTRY_API_URL
    )
    const amulet = { admin: amuletAsset.admin, id: amuletAsset.id }

    const paymaster = await admin.party.internal.allocate({
        partyHint: `traffic_paymaster_${randomUUID().slice(0, 8)}`,
    })
    console.log(`Paymaster party: ${paymaster}`)

    const setup = await admin.traffic.setup({
        paymaster,
        conversionRates: [
            { instrumentId: amulet, conversionRate: BYTES_PER_AMULET },
        ],
    })
    if (setup.commands.length > 0) {
        await admin.ledger.internal.submit({
            commands: setup.commands,
            actAs: [paymaster],
        })
    }
    console.log(`Selling traffic for Amulet at ${BYTES_PER_AMULET} bytes/Amulet`)

    const preapprovalCommand = await admin.amulet.preapproval.command.create({
        parties: { receiver: paymaster },
    })
    await admin.ledger.internal.submit({
        commands: [preapprovalCommand],
        actAs: [paymaster],
    })
    await admin.amulet.preapproval.fetchStatus(paymaster)
    console.log('Paymaster preapproved to receive Amulet')

    const paymasterApi = await PaymasterApi.start({
        traffic: admin.traffic,
        ledger: admin.ledger,
        paymaster,
    })
    console.log(`Paymaster API serving at ${paymasterApi.url}`)

    await fs.writeFile(
        path.join(here, '../.env.local'),
        `VITE_PAYMASTER_API_URL=${paymasterApi.url}\n` +
            `VITE_PAYMASTER_PARTY_ID=${paymaster}\n`
    )
    console.log('Wrote .env.local for the UI and the topup script')

    console.log('Ready. Leave this running, then start `pnpm topup` and `pnpm dev`.')
    process.on('SIGINT', () => {
        void paymasterApi.stop().then(() => process.exit(0))
    })
    await new Promise(() => undefined)
}

main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
})
