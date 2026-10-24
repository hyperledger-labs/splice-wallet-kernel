// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Ops } from '@canton-network/core-provider-ledger'
import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'
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
 * Specifies how much traffic to buy:
 * - `trafficAmount`: buy that many bytes and return any change; requires a rate.
 * - Omitted: spend all offered holdings; the rate is not needed.
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
