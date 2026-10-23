// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Taps Amulet into a party's holdings so it has something to pay for traffic
 * with -- the admin-side equivalent of the tap button this dApp's UI used to
 * carry, and the Amulet counterpart to `topup.ts` for traffic. One-shot:
 * submits the tap, prints the new state, and exits.
 *
 * `tap` is a DevNet dev faucet, so this is LocalNet/DevNet only. It submits the
 * tap as the receiving party, so the party must be one this admin participant
 * hosts (and can act as) -- the same ledger user the other scripts run as.
 *
 * Usage: pnpm tap-amulet -- <partyId> [amount]
 */
import { createAdminSdk } from './lib.js'

/** One Amulet, matching the UI's old default tap amount. */
const DEFAULT_AMOUNT = '10'

async function main() {
    // pnpm forwards the `--` separator to the script rather than eating it, so
    // the documented `pnpm tap-amulet -- <partyId> [amount]` arrives as
    // ['--', partyId, amount]. Drop a leading one so both spellings work --
    // see `topup.ts` for why leaving it in place shifts every argument along.
    const argv = process.argv.slice(2)
    const [partyId, amountArg] = argv[0] === '--' ? argv.slice(1) : argv

    if (!partyId) {
        console.error('Usage: pnpm tap-amulet -- <partyId> [amount]')
        process.exit(1)
    }

    const amount = amountArg ?? DEFAULT_AMOUNT
    // Amulet is a decimal asset, so any positive amount is valid (not just
    // whole numbers, unlike traffic's byte count). The SDK rounds to 10 dp.
    if (!(Number(amount) > 0)) {
        console.error(
            `Amount must be a positive number, got ${JSON.stringify(amountArg)}.`
        )
        process.exit(1)
    }

    const admin = await createAdminSdk()
    const { updateId } = await admin.amulet.tapInternal(amount, { partyId })
    console.log(`Tapped ${amount} Amulet to ${partyId}; update ${updateId}.`)
}

main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
})

