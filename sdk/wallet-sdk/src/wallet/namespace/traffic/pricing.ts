// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Decimal } from 'decimal.js'
import type { Numeric } from '@canton-network/core-types'

/**
 * Client-side mirror of the pricing arithmetic in
 * `damljs/traffic-purchase-models/daml/Tea/TrafficPurchase.daml`.
 *
 * This exists because the registry has to be told the exact amount before the
 * ledger computes it. `TrafficPurchaser_PurchaseCredits` works out for itself
 * what the requested traffic costs and hands that figure to
 * `TransferFactory_Transfer`, whose choice context was fetched for a transfer of
 * whatever amount we asked the registry about. Disagreeing by a single unit
 * means a context fetched for a transfer the ledger will not make.
 *
 * So these functions track the model's `assetNeededFor` and `wholeBytes`
 * exactly, including the rounding *direction*: cost rounds up and traffic rounds
 * down, so a buyer never receives traffic they did not pay for.
 *
 * Amounts stay strings end to end -- `Numeric` is `@daml/types`' alias for
 * exactly that -- because a Daml `Decimal` carries up to 38 digits and a JS
 * `number` cannot hold the ones a real registry can mint. Every such string is
 * base-10 with no exponent (`'1048576'`, `'0.5'`); exponent notation is refused
 * rather than reinterpreted, since the participant rejects it too.
 *
 * The module is deliberately pure -- no SDK context -- so a malformed figure
 * leaves here as a plain `Error`. `TrafficAccountNamespace` translates those into
 * `SDKError`s, so that a caller sees one kind of failure from the namespace.
 */

/** A Daml `Decimal` carries exactly 10 decimal places. */
const DAML_DECIMAL_PLACES = 10

/** A Daml `Decimal` is bounded at 38 significant digits. */
const DamlDecimal = Decimal.clone({
    precision: 38,
    toExpNeg: -40,
    toExpPos: 40,
})

/**
 * Parses a Daml `Decimal`.
 *
 * Exponent notation is refused rather than reinterpreted: `Decimal` has no such
 * spelling, the participant rejects it, and quietly rewriting it would hide a
 * misplaced decimal point of exactly the kind `maxTrafficPerPurchase` exists to
 * bound.
 */
function toDecimal(value: Numeric, field: string): Decimal {
    if (!/^-?\d+(\.\d+)?$/.test(value)) {
        throw new Error(
            `Expected ${field} to be a decimal number, got "${value}"`
        )
    }
    return new DamlDecimal(value)
}

function assertPositiveRate(rate: Numeric): Decimal {
    const conversionRate = toDecimal(rate, 'the conversion rate')
    if (conversionRate.lessThanOrEqualTo(0)) {
        throw new Error(
            `Expected the conversion rate to be positive, got "${rate}"`
        )
    }
    return conversionRate
}

/**
 * Traffic is measured in whole bytes, so a fractional amount is floored.
 *
 * Mirrors `wholeBytes` in the model. Rounding *down* is deliberate: the
 * alternative hands out traffic that was never paid for.
 */
export function wholeBytes(amount: Numeric): Numeric {
    return toDecimal(amount, 'the traffic amount').floor().toFixed()
}

/**
 * The asset needed to buy exactly `traffic` bytes at `rate` bytes per unit.
 *
 * Mirrors `assetNeededFor`. Rounds *up*, so the buyer never receives more
 * traffic than they paid for.
 *
 * Daml `Decimal` is fixed-point with 10 decimal places and banker's rounding,
 * which is why the division is quantised to 10 places half-even *before* the
 * ceiling. Rounding only at the end would disagree with the ledger on exact
 * multiples, which is precisely where a caller asks for a round number of bytes.
 */
export function assetNeededFor(traffic: Numeric, rate: Numeric): Numeric {
    return toDecimal(traffic, 'the traffic amount')
        .dividedBy(assertPositiveRate(rate))
        .toDecimalPlaces(DAML_DECIMAL_PLACES, Decimal.ROUND_HALF_EVEN)
        .ceil()
        .toFixed()
}

/** Sums holding amounts the way `ConversionRate_ValidateAssets` does. */
export function sumAmounts(amounts: Numeric[]): Numeric {
    return amounts
        .reduce(
            (total, amount) => total.plus(toDecimal(amount, 'the amount')),
            new DamlDecimal(0)
        )
        .toFixed()
}
