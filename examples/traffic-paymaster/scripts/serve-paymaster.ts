// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Serves the paymaster's off-ledger API `pnpm initialize` set up a paymaster
 * for. Long-running: the UI's `purchaseTraffic` call fetches the paymaster's
 * live contract ids and disclosures from this server at purchase time, and
 * its rate/paymaster display panel reads from it too. Leave running until
 * Ctrl+C.
 */
import { requireEnvVar, writeEnvVar } from './env-file.js'
import { createAdminSdk } from './lib.js'
import { PaymasterApi } from './paymaster-api.js'

async function main() {
    const paymaster = await requireEnvVar('VITE_PAYMASTER_PARTY_ID')
    const admin = await createAdminSdk()

    const paymasterApi = await PaymasterApi.start({
        traffic: admin.traffic,
        ledger: admin.ledger,
        paymaster,
    })
    await writeEnvVar('VITE_PAYMASTER_API_URL', paymasterApi.url)

    console.log(`Paymaster API for ${paymaster} serving at ${paymasterApi.url}`)
    console.log('Leave this running. Ctrl+C to stop.')

    process.on('SIGINT', () => {
        void paymasterApi.stop().then(() => process.exit(0))
    })
    await new Promise(() => undefined)
}

main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
})
