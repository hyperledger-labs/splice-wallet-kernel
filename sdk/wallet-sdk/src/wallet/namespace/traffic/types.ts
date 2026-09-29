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

/** The off-ledger user a purchase buys traffic for. */
export type TrafficTargetUser = {
    /**
     * The Canton traffic account id.
     *
     * As of Canton 3.5 this is a party id (`hint::fingerprint`), which is why
     * `topUpTraffic` and `getTraffic` take the same value; Canton intends to
     * decouple the two, and the Daml model types it as `Text` rather than
     * `Party` for that reason -- so it is a plain string here too, not a
     * `PartyId`.
     */
    accountId: string
    /**
     * Distinguishes tenants when one paymaster serves several, so their account
     * ids cannot collide. Free-form, and empty when a paymaster serves one
     * tenant, which is the common case.
     */
    scope?: string
}

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
           * Bytes to buy, as a Daml `Decimal`: a base-10 string with no
           * exponent, e.g. `'2097152'`. Must be a whole number -- traffic is
           * counted in whole bytes and a fractional request is rejected.
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

/** What `purchaseTraffic` takes. */
export type PurchaseTrafficParams = {
    /**
     * The party paying, whose key signs the submission. Owns every holding
     * spent, and is the sender of the settling transfer.
     */
    purchaser: PartyId
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
    /**
     * The instrument to pay with, by its token-standard instrument id -- the
     * registry's own symbol for it, e.g. `'Amulet'`, **not** a contract id and
     * not the `{ admin, id }` pair. It is looked up against the registries the
     * namespace was extended with, which is where the admin party comes from.
     */
    instrumentId: string
    /** Base URL of the registry's off-ledger API, e.g. scan's. */
    registryUrl: URLInput
    /** The user to credit. Need not correspond to `purchaser`. */
    targetUser: TrafficTargetUser
    /**
     * Idempotency key, echoed onto the choice's result and used as the
     * deduplication id when the traffic is credited off-ledger.
     *
     * Free-form text; must not be empty, which the model enforces too. A new
     * uuid v4 when left out, which is what a first attempt wants; pass the id
     * of the attempt being retried so a retry cannot credit twice.
     */
    requestId?: string
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
     */
    disclosedContracts?: LedgerCommonSchemas['DisclosedContract'][]
} & PurchaseTrafficAmount
