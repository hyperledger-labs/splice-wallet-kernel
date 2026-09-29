// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Ops } from '@canton-network/core-provider-ledger'
import type {
    LedgerCommonSchemas,
    WrappedCommand,
} from '@canton-network/core-ledger-client-types'
import type { InstrumentId } from '@canton-network/core-token-standard'
import type { Numeric, PartyId } from '@canton-network/core-types'
import type { URLInput } from '../utils/url.js'

/** The state a participant reports for one traffic account. */
export type TrafficAccount =
    Ops.GetV2TrafficAccountsAccountId['ledgerApi']['result']

type UpdateAccountBody =
    Ops.PostV2TrafficAccounts['ledgerApi']['params']['body']

export type TopUpTrafficParams = Omit<
    UpdateAccountBody,
    'balanceDelta' | 'deduplicationId'
> & {
    /** Bytes to add to the balance. A negative value subtracts. */
    balanceDelta: number
    deduplicationId?: string
}

/**
 * A ledger contract id, as the Ledger API renders it.
 *
 * An opaque string whose exact format is the ledger's business -- currently a
 * hex blob such as `00a1b2...`. Left unbranded (rather than `ContractId<T>`
 * from `@daml/types`) so a caller can pass the string the ledger handed it
 * without a cast, which is how every other contract-id parameter in the SDK
 * behaves.
 */
export type ContractIdString = string

/**
 * How much is being bought.
 *
 * Two arms, matching the model's two branches. Naming a `trafficAmount` buys
 * exactly that many bytes and takes change back, which needs the rate to price
 * it. Naming neither spends the offered holdings in full, where the cost is the
 * holdings' own total and the rate never enters the calculation -- so requiring
 * it there would be asking for a figure that changes nothing.
 */
export type PurchaseTrafficAmount =
    | {
          /**
           * Bytes to buy, as a Daml `Int`: a base-10 integer string with no
           * exponent or decimal point, e.g. `'2097152'`. Traffic is counted in
           * whole bytes, and the model's `requestedTrafficAmount` is an `Int`.
           */
          trafficAmount: Numeric
          /**
           * The rate to buy at: the `conversionRate` field of the
           * `ConversionRate` contract named by `conversionRateCid`, in traffic
           * bytes per unit of the payment asset. A Daml `Decimal`, e.g.
           * `'1048576'` for 1 MiB per unit. Must be positive.
           *
           * Named as the model names it, and distinct from `conversionRateCid`:
           * this is the figure, that is the contract.
           *
           * The ledger prices the purchase from the contract, but the cost has
           * to be worked out before the registry is asked about the transfer --
           * so the caller states the rate it believes it is buying at. A rate
           * repriced since makes the ledger reject the purchase rather than
           * settle at a stale price.
           */
          conversionRate: Numeric
      }
    | { trafficAmount?: never; conversionRate?: never }

/**
 * How much is being bought, when the rate need not be stated.
 *
 * The same two branches as {@link PurchaseTrafficAmount}, except that naming a
 * `trafficAmount` no longer obliges a caller to state the rate: with a
 * `paymasterApiUrl` the paymaster is asked for it. Stating it anyway pins the
 * price the purchase is priced at, which is what a caller buying against a
 * contract it already holds a disclosure for wants.
 */
export type ResolvablePurchaseTrafficAmount =
    | {
          /** As {@link PurchaseTrafficAmount}: whole bytes, no exponent. */
          trafficAmount: Numeric
          /**
           * As {@link PurchaseTrafficAmount}, but optional: left out, the rate
           * the paymaster serves for `instrumentId` is used.
           */
          conversionRate?: Numeric | undefined
      }
    | { trafficAmount?: never; conversionRate?: never }

/** What every purchase takes, however the paymaster's half is arrived at. */
type PurchaseTrafficCommon = {
    /**
     * The party paying, whose key signs the submission. Owns every holding
     * spent, and is the sender of the settling transfer.
     */
    purchaser: PartyId
    /**
     * The instrument to pay with, by its token-standard instrument id -- the
     * registry's own symbol for it, e.g. `'Amulet'`, **not** a contract id and
     * not the `{ admin, id }` pair. It is looked up against the registries the
     * namespace was extended with, which is where the admin party comes from.
     */
    instrumentId: string
    /**
     * Base URL of the *token* registry's off-ledger API, e.g. scan's.
     *
     * Distinct from `paymasterApiUrl`: this one is asked how the payment would
     * settle, that one about the paymaster's own contracts. They are different
     * servers run by different parties.
     */
    registryUrl: URLInput
    /**
     * The TEA account to credit, as the model's `AccountId`.
     *
     * Need not correspond to `purchaser`: a wallet provider may buy on a user's
     * behalf. Non-empty and at most 255 UTF-16 code units, which the model's
     * `AccountId` enforces too. As of Canton 3.5 this is a party id
     * (`hint::fingerprint`), which is why `topUpTraffic` and `getTraffic` take
     * the same value; Canton intends to decouple the two, so it is a plain
     * string here, not a `PartyId`.
     */
    targetAccount: string
    /**
     * Contract ids of the `Splice.Api.Token.HoldingV1:Holding` contracts to
     * spend. Must be owned by `purchaser` and of `instrumentId`.
     *
     * Left out, enough of the purchaser's unlocked holdings are selected to
     * cover the cost. Named `inputUtxos` for consistency with
     * `token.transfer.create`.
     */
    inputUtxos?: ContractIdString[]
    /** The deadline the registry must settle by. Ten minutes out when left out. */
    executeBefore?: Date
    /**
     * The paymaster's `TrafficPurchaser` and `ConversionRate` as disclosures.
     *
     * Both are signed by the paymaster alone, so a submission naming them has to
     * carry them; only a party that can read them can produce the blobs, which
     * makes producing these the paymaster's job rather than the buyer's.
     *
     * Required reading without a `paymasterApiUrl`. With one, these are merged
     * over what the paymaster served and win a collision, so a caller can still
     * pin a blob it already holds.
     */
    disclosedContracts?: LedgerCommonSchemas['DisclosedContract'][]
}

/**
 * The paymaster's half of a purchase, stated by the caller.
 *
 * What every call looked like before there was an API to ask. Getting the
 * disclosures is the hard part: only a party that can read the two contracts
 * produces their blobs, so they have to reach the buyer out of band.
 */
type StatedPaymasterTerms = {
    paymasterApiUrl?: undefined
    /**
     * Contract id of the paymaster's
     * `#traffic-purchase-models:Tea.TrafficPurchase:TrafficPurchaser`, the
     * contract whose `TrafficPurchaser_PurchaseCredits` choice this exercises.
     * Must travel in `disclosedContracts`.
     */
    trafficPurchaserCid: ContractIdString
    /**
     * Contract id of the `#traffic-purchase-models:Tea.TrafficPurchase:ConversionRate`
     * to buy at. Must be for `instrumentId`, and must travel in
     * `disclosedContracts`.
     *
     * The *figure* it prices at is `conversionRate`; this is the contract.
     */
    conversionRateCid: ContractIdString
    /**
     * The party payments go to, as the `TrafficPurchaser` names it.
     *
     * Stated rather than read off the contract: the buyer is not a stakeholder
     * on it, and the registry has to be asked about a transfer to a *specific*
     * receiver before anything is submitted. A receiver that disagrees with the
     * contract makes the ledger reject the purchase.
     */
    paymasterReceiver: PartyId
} & PurchaseTrafficAmount

/**
 * The paymaster's half of a purchase, fetched from the paymaster itself.
 *
 * Every field here stays settable, and a value given wins over the one served:
 * pinning a contract id is the only way to buy against a disclosure already in
 * hand, and a paymaster that repriced since would otherwise make that
 * impossible. Nothing is cross-checked against the served answer -- an
 * incoherent set is rejected by the ledger, and `prepare` reports that before
 * anything is signed, on better evidence than a paymaster's own HTTP reply.
 */
type FetchedPaymasterTerms = {
    /**
     * Base URL of the paymaster's traffic-purchase off-ledger API, e.g.
     * `https://paymaster.example`.
     *
     * Two reads under `/registry/traffic-purchase/v1` supply the purchaser
     * contract, the receiver, the rate and its contract, and -- the point of
     * the exercise -- the disclosures for both, which a buyer cannot produce
     * for itself.
     *
     * This does not replace `registryUrl`, and does not remove the need for
     * `sdk.extend({ traffic: ... })`: the token registry is still what prices
     * the payment.
     *
     * Note for a caller holding a `URLInput | undefined`: spread it rather than
     * assigning it, `...(url === undefined ? {} : { paymasterApiUrl: url })`.
     * Assigning `undefined` matches neither arm of this union.
     */
    paymasterApiUrl: URLInput
    /** As {@link StatedPaymasterTerms}. Served by the paymaster when left out. */
    trafficPurchaserCid?: ContractIdString | undefined
    /** As {@link StatedPaymasterTerms}. Served by the paymaster when left out. */
    conversionRateCid?: ContractIdString | undefined
    /** As {@link StatedPaymasterTerms}. Served by the paymaster when left out. */
    paymasterReceiver?: PartyId | undefined
} & ResolvablePurchaseTrafficAmount

/**
 * What `purchaseTraffic` takes.
 *
 * Two arms, by whether the paymaster has an off-ledger API to ask. Without a
 * `paymasterApiUrl` every field of the paymaster's half has to be stated, which
 * is what the type said before this union existed; with one they are all
 * optional, and anything left out is fetched.
 */
export type PurchaseTrafficParams = PurchaseTrafficCommon &
    (StatedPaymasterTerms | FetchedPaymasterTerms)

/**
 * A rate to sell traffic at. One per instrument the paymaster takes as payment.
 *
 * This is the *whole* intended terms of the rate, not a patch over what is
 * already on the ledger: `setup` converges a rate onto exactly what a spec
 * says. So leaving `expiresAt` out of a repeat call sets it to `None` -- it does
 * not keep the expiry a previous call gave. It is the one way a caller can undo
 * configuration by writing less.
 */
export type ConversionRateSpec = {
    /**
     * The token-standard instrument accepted as payment, as the Daml model
     * names it: the registry that administers it, and its id there.
     *
     * Stated as the pair rather than as a registry symbol -- unlike
     * `PurchaseTrafficParams['instrumentId']` -- so `setup` needs no registry
     * and works without `sdk.extend({ traffic: ... })`.
     */
    instrumentId: InstrumentId
    /**
     * Traffic bytes per unit of the payment asset, as a Daml `Decimal`: a
     * base-10 string with no exponent, e.g. `'1048576'` for 1 MiB per unit.
     * Must be positive, which the model's `ensure` clause also requires.
     */
    conversionRate: Numeric
    /**
     * When the rate stops being usable. Open-ended when left out.
     *
     * Worth setting: buyers cache the disclosure for this contract, so without
     * an expiry a stale cached rate stays exercisable until someone archives it.
     */
    expiresAt?: Date
    /**
     * Ceiling on a single purchase, in bytes. Unbounded when left out.
     *
     * Bounds the damage from a misplaced decimal point in `conversionRate`.
     */
    maxTrafficPerPurchase?: Numeric
}

/** What `setup` takes. */
export type SetupTrafficParams = {
    /**
     * The party selling traffic, and sole signatory of both templates. Must
     * already exist -- allocate one with `sdk.party.internal.allocate` and
     * grant rights with `sdk.user.rights.grant`, which are an operator's steps
     * rather than this method's.
     */
    paymaster: PartyId
    /**
     * The party payments are transferred to.
     *
     * Applied when a purchaser is created, where it defaults to `paymaster`,
     * and *checked* when one already exists: `TrafficPurchaser` has no choice
     * that moves it, so a purchaser paying somewhere else is reported rather
     * than quietly kept. Left out means no opinion, and an existing purchaser's
     * receiver is adopted whatever it is.
     */
    paymasterReceiver?: PartyId
    /**
     * The `TrafficPurchaser` to sell through, when the paymaster's own cannot be
     * told apart.
     *
     * Not needed in the ordinary case: the paymaster's purchaser is discovered
     * and reused. It is the way out of a paymaster that already carries two of
     * them, and the way to pin the one a buyer's cached disclosure already
     * names. Checked against the ledger: a contract that is not an active
     * purchaser of this paymaster is refused rather than sold through.
     */
    trafficPurchaser?: ContractIdString
    /**
     * What the paymaster accepts as payment, and at what rate.
     *
     * Each spec is the whole intended terms of its rate, not a patch. Instruments
     * that no spec names are not touched at all -- convergence is scoped to the
     * instruments a call names, so a partial call can never withdraw an
     * instrument from sale.
     */
    conversionRates: ConversionRateSpec[]
}

/** What a setup would do to one contract. */
export type SetupStatus = 'created' | 'updated' | 'unchanged'

/** One `ConversionRate`, and what the plan does to it. */
export type TrafficSetupRate = {
    instrumentId: InstrumentId
    status: SetupStatus
    /**
     * Known up front only for a rate left alone. A created or repriced one has
     * no contract id until the caller's own transaction commits, since both
     * produce a fresh contract -- `ConversionRate_Update` archives the old one.
     */
    contractId?: ContractIdString
}

/**
 * What `setup` worked out the ledger needs, and the commands that get it there.
 *
 * Nothing has been submitted: the paymaster signs for itself, so the caller
 * drives either `sdk.ledger.internal.submit({ commands, actAs: [paymaster] })`
 * for a participant-hosted paymaster, or
 * `sdk.ledger.prepare({ partyId: paymaster, commands }).sign(key).execute(...)`
 * for an external one.
 */
export type TrafficSetupPlan = {
    /** The paymaster the contracts are signed by. */
    paymaster: PartyId
    /**
     * Everything to submit, in one transaction.
     *
     * Creates and exercises come back in one list on purpose, so a setup takes
     * effect whole or not at all: a purchaser with no rate sells nothing, and a
     * rate with no purchaser cannot be bought at. Empty when the ledger already
     * says what the params ask for, which is the point of converging rather
     * than an edge case.
     */
    commands: WrappedCommand<'CreateCommand' | 'ExerciseCommand'>[]
    /**
     * The `TrafficPurchaser` a purchase exercises `TrafficPurchaser_PurchaseCredits`
     * on. `contractId` is present only when an existing one is reused, and
     * `status` is never `'updated'`: the template has no choice that changes it.
     */
    trafficPurchaser: {
        contractId?: ContractIdString
        status: SetupStatus
    }
    /** One entry per rate, in the order they were asked for. */
    conversionRates: TrafficSetupRate[]
    /**
     * The paymaster's contracts as disclosures, for a buyer's `purchaseTraffic`.
     *
     * Only covers the contracts this plan leaves alone -- a created or repriced
     * one has no contract id yet. Re-resolve those with `sdk.ledger.disclose`
     * once the commands have been submitted.
     */
    disclosedContracts: LedgerCommonSchemas['DisclosedContract'][]
}

/**
 * A `ConversionRate` that is live on the ledger, with its terms as the ledger
 * renders them.
 *
 * The figures stay in the ledger's own spelling -- decimals normalised to 10
 * places, the timestamp as an ISO-8601 string with trailing fractional zeros
 * dropped -- because reinterpreting them here would lose the very thing a
 * comparison against a `ConversionRateSpec` has to account for.
 */
export type ActiveConversionRate = {
    contractId: ContractIdString
    instrumentId: InstrumentId
    /** Traffic bytes per unit, e.g. `'1048576.0000000000'`. */
    conversionRate: Numeric
    /** Absent for Daml `None`, which is an open-ended rate. */
    expiresAt?: string
    /** Absent for Daml `None`, which is an unbounded purchase. */
    maxTrafficPerPurchase?: Numeric
}

/**
 * A `TrafficPurchaser` that is live on the ledger.
 *
 * `paymasterReceiver` is absent when the arguments could not be read: a
 * purchaser whose receiver cannot be decoded still exists, and still has to
 * count as the paymaster's one purchaser.
 */
export type ActiveTrafficPurchaser = {
    contractId: ContractIdString
    paymasterReceiver?: PartyId
}

/** A paymaster's setup as it stands on the ledger. */
export type ActiveTrafficSetup = {
    trafficPurchasers: ActiveTrafficPurchaser[]
    conversionRates: ActiveConversionRate[]
}
