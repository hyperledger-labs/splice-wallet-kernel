// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Manually credits one party's traffic balance, bypassing a real purchase --
 * useful for topping an account up directly while testing. One-shot: prints
 * the new balance and exits. For crediting actual purchases as they happen,
 * see `scan-topup.ts`.
 *
 * Usage: pnpm topup -- <partyId> [bytes]
 */
import { createAdminSdk, BYTES_PER_AMULET } from './lib.js'

async function main() {
    const [partyId, bytesArg] = process.argv.slice(2)
    if (!partyId) {
        console.error('Usage: pnpm topup -- <partyId> [bytes]')
        process.exit(1)
    }

    const balanceDelta = Number(bytesArg ?? BYTES_PER_AMULET)
    const admin = await createAdminSdk()
    const account = await admin.traffic.topUpTraffic({
        accountId: partyId,
        balanceDelta,
        deduplicationId: `manual-topup-${Date.now()}`,
    })
    console.log(
        `Credited ${balanceDelta} bytes to ${partyId}; balance is now ${account.balance}`
    )
}

main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
})
