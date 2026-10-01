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
    // pnpm passes the `--` separator through to the script rather than eating it, so the
    // documented `pnpm topup -- <partyId> [bytes]` arrives as ['--', partyId, bytes]. Left in
    // place it shifts every argument along one, making `--` the party and the party the byte
    // count -- which parses to NaN and is the one input the participant answers with no account
    // state at all. Dropping a leading one accepts both spellings.
    const argv = process.argv.slice(2)
    const [partyId, bytesArg] = argv[0] === '--' ? argv.slice(1) : argv

    if (!partyId) {
        console.error('Usage: pnpm topup -- <partyId> [bytes]')
        process.exit(1)
    }

    const balanceDelta = Number(bytesArg ?? BYTES_PER_AMULET)
    if (!Number.isInteger(balanceDelta)) {
        // Guarded here as well as in the SDK so the message names the argument the user typed.
        console.error(
            `Byte count must be a whole number, got ${JSON.stringify(bytesArg)}.`
        )
        process.exit(1)
    }

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
