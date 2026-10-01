// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Decimal } from 'decimal.js'
import type { Ops } from '@canton-network/core-provider-ledger'
import {
    HOLDING_INTERFACE_ID,
    type HoldingView,
    type InstrumentId,
    type Transfer,
} from '@canton-network/core-token-standard'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import {
    ConversionRate,
    TrafficPurchaseApiError,
    TrafficPurchaseClient,
    TrafficPurchaser,
    type ConversionRateWithDisclosures,
    type TrafficPurchaser_PurchaseCredits,
    type TrafficPurchaserWithDisclosures,
} from '@canton-network/core-traffic-purchase'
import type { AccessTokenProvider } from '@canton-network/core-wallet-auth'
import { ACSReader } from '@canton-network/core-acs-reader'
import type { PrettyContract } from '@canton-network/core-tx-parser'
import type { Numeric, PartyId } from '@canton-network/core-types'
import type { SDKContext } from '../../init/types/context.js'
import type { SDKLogger } from '../../logger/logger.js'
import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'
import type { PreparedCommand } from '../transactions/types.js'
import {
    dedupeDisclosedContracts,
    toDisclosedContract,
} from '../transactions/disclosure.js'
import { findAsset } from '../asset/index.js'
import { ParsedURL, parseAssets } from '../utils/url.js'
import {
    assetNeededFor,
    damlDecimal,
    sumAmounts,
    wholeBytes,
} from './pricing.js'
import { assertSetupParams, planTrafficSetup, trafficSetupOf } from './setup.js'
import type {
    ActiveTrafficSetup,
    ContractIdString,
    PurchaseTrafficParams,
    SetupTrafficParams,
    TopUpTrafficParams,
    TrafficAccount,
    TrafficSetupPlan,
} from './types.js'

/** How long a purchase gives the registry to settle, when the caller says nothing. */
const DEFAULT_EXECUTE_BEFORE_MS = 10 * 60 * 1000

/**
 * How far in the past the transfer the registry is asked about says it was
 * requested.
 *
 * `requestedAt` must not be after the ledger effective time -- Amulet asserts
 * that to the microsecond -- and the clock this runs on is not the
 * participant's. A minute of slack is what splice's own tooling allows, and it
 * is the same figure `core-token-standard-service` uses.
 *
 * The figure only ever reaches the registry: the transfer the ledger settles is
 * built by `TrafficPurchaser_PurchaseCredits` with `requestedAt = getTime`, i.e.
 * the ledger effective time itself, so the assertion cannot fail on the ledger's
 * own figure.
 */
const REQUESTED_AT_SKEW_MS = 60_000

/**
 * The registry's choice context, as the choice expects it.
 *
 * Taken off the model's own choice type rather than from
 * `@canton-network/core-token-standard`: both packages carry their own copy of
 * the generated `AnyValue`, and being recursive the two are not interchangeable
 * to TypeScript even though they describe the same wire format. The one the
 * model was built against is the one that has to typecheck.
 */
type TransferExtraArgs = TrafficPurchaser_PurchaseCredits['transferExtraArgs']

/**
 * What `purchaseTraffic` needs on top of the base context: a registry to ask how
 * a payment would settle, and a way to read the buyer's holdings.
 *
 * Supplied by `sdk.extend({ traffic: ... })`. The base namespace is built
 * without it, so `getTraffic` and `topUpTraffic` -- which are pure Ledger API
 * calls -- cost a caller no registry configuration.
 */
export type TrafficPurchaseContext = {
    tokenStandardService: TokenStandardService
    registryUrls: ParsedURL[]
    /**
     * What authenticates against a paymaster's off-ledger API.
     *
     * Kept apart from the token registries' provider because a paymaster URL is
     * a *per-call* parameter: reusing the configured bearer token would send it
     * to whatever host a caller happens to name. Defaults to sending none.
     */
    paymasterAuth: AccessTokenProvider
}

/**
 * The paymaster's half of a purchase, however it was arrived at.
 *
 * What `purchaseTraffic` works with once a caller's params and a paymaster's
 * answers have been reconciled, so nothing downstream has to know which of the
 * two a figure came from.
 */
type PaymasterTerms = {
    trafficPurchaserCid: ContractIdString
    conversionRateCid: ContractIdString
    paymasterReceiver: PartyId
    /** The rate to price at. Present exactly when a `trafficAmount` needs pricing. */
    conversionRate?: Numeric
    disclosedContracts: LedgerCommonSchemas['DisclosedContract'][]
}

/** What a paymaster answered, when there was one to ask. */
type ServedTerms = {
    purchaser?: TrafficPurchaserWithDisclosures
    rate?: ConversionRateWithDisclosures
}

/**
 * Traffic accounting on a Canton participant, and buying traffic on-ledger.
 *
 * The `/v2/traffic/*` endpoints behind `getTraffic`/`topUpTraffic` are only
 * served when the participant runs with `traffic-enforcement.enabled = true`;
 * against one that does not, they answer 404.
 */
export class TrafficAccountNamespace {
    private readonly logger: SDKLogger
    private readonly acsReader: ACSReader

    constructor(
        private readonly ctx: SDKContext,
        private readonly purchaseCtx?: TrafficPurchaseContext
    ) {
        this.logger = ctx.logger.child({ namespace: 'TrafficAccountNamespace' })
        this.acsReader = new ACSReader(ctx.ledgerProvider)
    }

    /**
     * Current traffic balance of an account.
     *
     * Needs `ActAs` or `ExecuteAs` rights on the party the account id names.
     */
    public async getTraffic(accountId: string): Promise<TrafficAccount> {
        this.logger.debug({ accountId }, 'Fetching traffic account')

        return this.ctx.ledgerProvider.request<Ops.GetV2TrafficAccountsAccountId>(
            {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/traffic/accounts/{account-id}',
                    requestMethod: 'get',
                    path: { 'account-id': accountId },
                },
            }
        )
    }

    /**
     * Applies a balance delta to an account, and reports the state it came to.
     *
     * Admin-only, and off-ledger: this moves the participant's own accounting,
     * so nothing about it is recorded on the ledger.
     */
    public async topUpTraffic(
        params: TopUpTrafficParams
    ): Promise<TrafficAccount> {
        const { accountId, balanceDelta } = params
        const deduplicationId = params.deduplicationId ?? crypto.randomUUID()

        // `balanceDelta` is optional in the Ledger API's own request schema, and JSON renders a
        // non-finite number as `null` -- so a NaN delta reaches the participant as a request to
        // apply no delta at all, which it answers with an empty body rather than an error. Caught
        // here because the resulting `null` account is indistinguishable from a transport fault by
        // the time a caller sees it, and because NaN is always a bug at the call site.
        if (!Number.isFinite(balanceDelta)) {
            throw new Error(
                `topUpTraffic needs a finite balanceDelta, got ${balanceDelta}. ` +
                    `Check what was parsed into it: Number() yields NaN for anything unparseable.`
            )
        }

        this.logger.debug(
            { accountId, balanceDelta, deduplicationId },
            'Topping up traffic account'
        )

        const updated =
            await this.ctx.ledgerProvider.request<Ops.PostV2TrafficAccounts>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/traffic/accounts',
                    requestMethod: 'post',
                    body: { accountId, balanceDelta, deduplicationId },
                },
            })

        // The spec types `response` as required, so nothing downstream expects to handle its
        // absence; returning it anyway would hand back a `null` typed as a `TrafficAccount` and
        // fail at whichever caller first read `.balance`, far from the cause.
        if (updated?.response == null) {
            throw new Error(
                `Participant returned no account state for traffic account ${accountId} ` +
                    `(delta ${balanceDelta}, deduplication id ${deduplicationId}).`
            )
        }

        return updated.response
    }

    /**
     * Builds the exercise that buys traffic from a paymaster, paying with
     * token-standard holdings.
     *
     * Prices the purchase, asks the registry how it would settle the payment,
     * and returns the `TrafficPurchaser_PurchaseCredits` command together with
     * every contract the submission has to disclose. Nothing is submitted here:
     * the buyer signs for itself, so the caller drives
     * `sdk.ledger.prepare(...).sign(key).execute(...)`.
     *
     * The paymaster's half of the purchase -- its `TrafficPurchaser`, the
     * `ConversionRate` and its rate, the receiver, and the disclosures for both
     * contracts -- is either stated by the caller or, given a
     * `paymasterApiUrl`, read off the paymaster's own off-ledger API. The
     * disclosures are what makes the second worth having: the paymaster is the
     * sole signatory of both templates, so a buyer cannot produce their blobs
     * and they otherwise have to travel out of band. A stated value always
     * wins over a served one, so a caller can pin the contract a disclosure it
     * already holds names.
     *
     * Preparing interprets the transaction, so everything the Daml model refuses
     * -- an expired rate, a purchase over `maxTrafficPerPurchase`, holdings the
     * buyer does not own -- is reported by `prepare`, before anything is signed.
     * Those invariants are therefore deliberately not re-checked here.
     *
     * The purchase credits the traffic on-ledger: `TrafficPurchaser_PurchaseCredits`
     * creates a `TrafficCredit` for `targetAccount`, which the paymaster's
     * participant TEA reads off the transaction tree. The returned
     * `ContractId TrafficCredit` identifies that credit.
     */
    public async purchaseTraffic(
        params: PurchaseTrafficParams
    ): Promise<PreparedCommand<'ExerciseCommand'>> {
        const purchaseCtx = this.purchaseCtx
        if (purchaseCtx === undefined) {
            this.ctx.error.throw({
                message:
                    'traffic.purchaseTraffic needs a registry to price the payment against. ' +
                    'Call sdk.extend({ traffic: { registries, auth } }) first.',
                type: 'SDKOperationUnsupported',
            })
        }

        const executeBefore =
            params.executeBefore ??
            new Date(Date.now() + DEFAULT_EXECUTE_BEFORE_MS)

        const paymasterApi =
            params.paymasterApiUrl === undefined
                ? undefined
                : new TrafficPurchaseClient(
                      new ParsedURL(this.ctx, params.paymasterApiUrl).href,
                      this.logger,
                      purchaseCtx.paymasterAuth
                  )

        // Started together rather than one after the other: the purchaser
        // endpoint says nothing about the instrument, so it does not have to
        // wait for the registry. `Promise.all` and not a promise awaited later,
        // so a paymaster that fails while `resolveAsset` is also failing does
        // not surface as an unhandled rejection.
        const [asset, servedPurchaser] = await Promise.all([
            this.resolveAsset(
                purchaseCtx,
                params.instrumentId,
                params.registryUrl
            ),
            paymasterApi === undefined
                ? undefined
                : this.served(
                      () => paymasterApi.getTrafficPurchaser(),
                      `The paymaster at ${paymasterApi.url} is not set up to sell traffic: ` +
                          'it has no TrafficPurchaser.'
                  ),
        ])
        const instrumentId: InstrumentId = {
            admin: asset.admin,
            id: asset.id,
        }

        // Only now, and not alongside the above: a rate is keyed by the
        // instrument's `{ admin, id }` pair, and the admin is whatever the
        // token registry just said it is. Guessing it to save a round trip
        // would be guessing which instrument is being paid with.
        const servedRate =
            paymasterApi === undefined
                ? undefined
                : await this.served(
                      () => paymasterApi.getConversionRate(instrumentId),
                      `The paymaster at ${paymasterApi.url} does not sell traffic for ` +
                          `${instrumentId.id} administered by ${instrumentId.admin}.`
                  )

        const terms = this.resolvePaymasterTerms(params, instrumentId, {
            ...(servedPurchaser && { purchaser: servedPurchaser }),
            ...(servedRate && { rate: servedRate }),
        })

        const { holdingCids, assetAmount } = await this.priceThePurchase(
            purchaseCtx,
            params,
            terms,
            instrumentId
        )

        this.logger.debug(
            {
                purchaser: params.purchaser,
                targetAccount: params.targetAccount,
                assetAmount,
                trafficAmount: params.trafficAmount,
                holdings: holdingCids.length,
            },
            'Pricing a traffic purchase'
        )

        const factory = await this.resolveTransferFactory(
            purchaseCtx,
            params,
            terms,
            instrumentId,
            asset.registryUrl,
            holdingCids,
            assetAmount,
            executeBefore
        )

        const choiceArgument: TrafficPurchaser_PurchaseCredits = {
            purchaser: params.purchaser,
            // The model's `AccountId` is an opaque record wrapping the id; the
            // ledger re-validates it (non-empty, at most 255 UTF-16 units).
            targetAccount: { value: params.targetAccount },
            // The generated contract-id types are branded, and a caller only
            // ever has the plain string the ledger reported.
            conversionRateCid:
                terms.conversionRateCid as TrafficPurchaser_PurchaseCredits['conversionRateCid'],
            holdingCids:
                holdingCids as unknown as TrafficPurchaser_PurchaseCredits['holdingCids'],
            transferFactoryCid:
                factory.factoryId as TrafficPurchaser_PurchaseCredits['transferFactoryCid'],
            // A Daml `Optional` is the value itself, or null for `None`;
            // `None` is what tells the choice to spend the holdings in full.
            requestedTrafficAmount: params.trafficAmount ?? null,
            executeBefore: executeBefore.toISOString(),
            transferExtraArgs: {
                context: { values: factory.contextValues },
                meta: { values: {} },
            },
        }

        return [
            {
                ExerciseCommand: {
                    templateId: TrafficPurchaser.templateId,
                    contractId: terms.trafficPurchaserCid,
                    choice: TrafficPurchaser.TrafficPurchaser_PurchaseCredits
                        .choiceName,
                    choiceArgument,
                },
            },
            // The paymaster's set and the registry's choice context overlap in
            // practice -- both can name the same instrument configuration --
            // and the participant rejects a contract disclosed twice.
            dedupeDisclosedContracts([
                ...terms.disclosedContracts,
                ...factory.disclosedContracts,
            ]),
        ]
    }

    /**
     * Works out what a paymaster's ledger needs in order to sell traffic, and
     * returns the commands that get it there.
     *
     * Idempotent by design. The ledger is meant to carry one `TrafficPurchaser`
     * per paymaster and one `ConversionRate` per instrument that paymaster
     * accepts, so this reads what is already there and plans only the
     * difference: what is missing is created, a rate whose terms have changed is
     * repriced through `ConversionRate_Update`, and one that already matches is
     * left alone. Calling it twice with the same params plans nothing at all;
     * the result says which of the three applies to each rate, since repricing
     * replaces a contract and invalidates any disclosure a buyer cached for it.
     *
     * Convergence is scoped to what the call names. Each `ConversionRateSpec` is
     * the whole intended terms of its rate rather than a patch -- a field left
     * out is set to `None` -- while an instrument no spec mentions is not
     * touched at all, so a partial call cannot withdraw an instrument from sale.
     *
     * Nothing is submitted here: the paymaster signs for itself, so the caller
     * drives `sdk.ledger.internal.submit({ commands, actAs: [paymaster] })` for
     * a participant-hosted paymaster, or
     * `sdk.ledger.prepare({ partyId: paymaster, commands })` for an external
     * one. Everything planned goes on in a single transaction, so a setup takes
     * effect whole or not at all.
     *
     * The model's DAR must already be vetted on the participant, and the
     * paymaster party must already exist -- deploying a package and allocating
     * a party are an operator's steps (`sdk.ledger.dar.upload`,
     * `sdk.party.internal.allocate`), not this method's.
     *
     * What it cannot do is serialise itself against another setup running at the
     * same moment. A paymaster that ends up with two purchasers, or an
     * instrument with two live rates, is reported with both contract ids named
     * rather than resolved by guessing -- see the note in `setup.ts`.
     */
    public async setup(params: SetupTrafficParams): Promise<TrafficSetupPlan> {
        const { paymaster } = params
        // Refused before the read, so a call that could never converge does not
        // spend a round trip on an ACS it is not going to use.
        this.rethrowAsBadRequest(() => assertSetupParams(params))

        const contracts = await this.readActiveSetup(paymaster)

        const existing = this.rethrowAsBadRequest(() =>
            trafficSetupOf(paymaster, contracts)
        )
        const plan = this.rethrowAsBadRequest(() =>
            planTrafficSetup(existing, params)
        )

        // Only the contracts the plan leaves alone can be disclosed: a created
        // or repriced one has no contract id until the caller's transaction
        // commits, and `sdk.ledger.disclose` is what resolves those afterwards.
        const reused = new Set(
            [
                plan.trafficPurchaser.contractId,
                ...plan.conversionRates.map((rate) => rate.contractId),
            ].filter((contractId) => contractId !== undefined)
        )
        const disclosedContracts = dedupeDisclosedContracts(
            contracts
                .filter((contract) => reused.has(contract.contractId))
                .map((contract) =>
                    toDisclosedContract(contract, this.ctx.error)
                )
        )

        this.logger.debug(
            {
                paymaster,
                commands: plan.commands.length,
                trafficPurchaser: plan.trafficPurchaser.status,
                conversionRates: plan.conversionRates.map((rate) => ({
                    instrumentId: rate.instrumentId,
                    status: rate.status,
                })),
            },
            'Planned a traffic setup'
        )

        return { ...plan, disclosedContracts }
    }

    /**
     * Everything of a paymaster's traffic setup that is live on the ledger.
     *
     * One ACS read filtered to the two templates. Useful on its own to diagnose
     * what `setup` refuses: a paymaster carrying two `TrafficPurchaser`s, or an
     * instrument priced by two live `ConversionRate`s.
     *
     * Needs no rights beyond the ones a setup already needs in order to submit,
     * since acting as a party implies reading as it.
     */
    public async readTrafficSetup(
        paymaster: PartyId
    ): Promise<ActiveTrafficSetup> {
        const contracts = await this.readActiveSetup(paymaster)
        return this.rethrowAsBadRequest(() =>
            trafficSetupOf(paymaster, contracts)
        )
    }

    /**
     * Reads the paymaster's `TrafficPurchaser` and `ConversionRate` contracts.
     *
     * Straight to the service rather than through the ACS cache: converging on
     * what the ledger says now is the whole point, and a cached answer could
     * plan a create for a contract that is already there.
     *
     * The filter this builds already asks for `includeCreatedEventBlob`, so one
     * read yields both the arguments to converge on and the blobs a buyer's
     * disclosures need. Filtering to the paymaster is enough to say the
     * contracts are its own: it is the sole signatory of both templates.
     */
    private async readActiveSetup(paymaster: PartyId) {
        return this.acsReader.raw.readJsContracts({
            parties: [paymaster],
            templateIds: [
                TrafficPurchaser.templateId,
                ConversionRate.templateId,
            ],
            filterByParty: true,
        })
    }

    /**
     * Runs a pure calculation, reporting the plain `Error` it rejects with as an
     * `SDKError`.
     *
     * `pricing.ts` and `setup.ts` are pure by design -- they hold no SDK context
     * -- so a `Decimal` that cannot be parsed, a non-positive rate, or a ledger
     * a setup refuses to converge all arrive as plain `Error`s. Every other
     * failure this namespace produces goes through `ctx.error.throw`, so the
     * translation belongs here rather than leaving a caller to handle two kinds
     * of error from one method.
     */
    private rethrowAsBadRequest<T>(compute: () => T): T {
        try {
            return compute()
        } catch (originalError) {
            return this.ctx.error.throw({
                message:
                    originalError instanceof Error
                        ? originalError.message
                        : String(originalError),
                type: 'BadRequest',
                originalError,
            })
        }
    }

    /** The instrument's admin and registry, as the configured registries report them. */
    private async resolveAsset(
        purchaseCtx: TrafficPurchaseContext,
        instrumentId: string,
        registryUrl: PurchaseTrafficParams['registryUrl']
    ) {
        const assets = parseAssets(
            this.ctx,
            await purchaseCtx.tokenStandardService.registriesToAssets(
                purchaseCtx.registryUrls
            )
        )

        return findAsset(
            assets,
            instrumentId,
            this.ctx.error,
            new ParsedURL(this.ctx, registryUrl)
        )
    }

    /**
     * Runs one read against a paymaster, reporting its failure as an `SDKError`.
     *
     * The status is what distinguishes the cases, which is why the client keeps
     * it: a 404 means the paymaster does not sell this and is a caller's
     * problem, while anything else is the paymaster's. A failure with no status
     * at all -- the host is down, DNS does not resolve -- lands in the same
     * `Unexpected` branch, which is where a caller would look for it anyway.
     */
    private async served<T>(
        read: () => Promise<T>,
        notFoundMessage: string
    ): Promise<T> {
        try {
            return await read()
        } catch (originalError) {
            const status =
                originalError instanceof TrafficPurchaseApiError
                    ? originalError.status
                    : undefined

            if (status === 404) {
                return this.ctx.error.throw({
                    message: notFoundMessage,
                    type: 'NotFound',
                    originalError,
                })
            }
            return this.ctx.error.throw({
                message:
                    originalError instanceof Error
                        ? originalError.message
                        : String(originalError),
                type:
                    status === 401
                        ? 'Unauthenticated'
                        : status === 403
                          ? 'Unauthorized'
                          : 'Unexpected',
                originalError,
            })
        }
    }

    /**
     * Reconciles what the caller stated with what the paymaster served.
     *
     * The rule is one line long: a stated value wins, field by field, and
     * nothing is cross-checked against the served answer. Pinning a contract id
     * is the only way to buy against a disclosure already in hand, and a
     * paymaster that repriced since would otherwise make that impossible. An
     * incoherent set is not this method's business either: the ledger rejects
     * one, and `prepare` reports that before anything is signed -- on better
     * evidence than a paymaster's own reply about its own contracts.
     *
     * What is checked is only what this code then goes on to *use*: that the
     * rate is for the instrument being paid with, that it parses, and that
     * every term ended up with a value from somewhere.
     */
    private resolvePaymasterTerms(
        params: PurchaseTrafficParams,
        instrumentId: InstrumentId,
        served: ServedTerms
    ): PaymasterTerms {
        if (
            served.rate !== undefined &&
            (served.rate.instrumentId.admin !== instrumentId.admin ||
                served.rate.instrumentId.id !== instrumentId.id)
        ) {
            // Not an invariant check but an identity one: pricing at another
            // instrument's rate overpays silently, and nothing downstream --
            // the registry least of all -- would notice.
            this.ctx.error.throw({
                message:
                    `The paymaster at ${String(params.paymasterApiUrl)} answered with a rate ` +
                    `for ${served.rate.instrumentId.id} administered by ` +
                    `${served.rate.instrumentId.admin}, not the ${instrumentId.id} ` +
                    `administered by ${instrumentId.admin} that was asked for.`,
                type: 'Unexpected',
            })
        }

        const trafficPurchaserCid =
            params.trafficPurchaserCid ?? served.purchaser?.trafficPurchaserId
        const conversionRateCid =
            params.conversionRateCid ?? served.rate?.conversionRateId
        const paymasterReceiver =
            params.paymasterReceiver ?? served.purchaser?.paymasterReceiver

        this.requireTerm(trafficPurchaserCid, 'trafficPurchaserCid')
        this.requireTerm(conversionRateCid, 'conversionRateCid')
        this.requireTerm(paymasterReceiver, 'paymasterReceiver')

        this.warnOnStaleTerms(params, served.rate)

        return {
            trafficPurchaserCid,
            conversionRateCid,
            paymasterReceiver,
            // Only priced when a traffic amount has to be converted into a
            // cost. Spending holdings in full never consults a rate, so a
            // paymaster serving an unparseable one does not fail that call.
            ...(params.trafficAmount === undefined
                ? {}
                : {
                      conversionRate: this.rateToPriceAt(
                          params,
                          served.rate,
                          conversionRateCid
                      ),
                  }),
            // The caller's go last, because `dedupeDisclosedContracts` keeps
            // the last entry for a contract id -- so an explicitly passed blob
            // beats the served one, as every other stated value does.
            disclosedContracts: dedupeDisclosedContracts([
                ...(served.purchaser?.disclosedContracts ?? []),
                ...(served.rate?.disclosedContracts ?? []),
                ...(params.disclosedContracts ?? []),
            ]),
        }
    }

    /**
     * The rate to price a traffic amount at.
     *
     * Stated wins, as everywhere else. The one case this refuses is a caller
     * that pins a `conversionRateCid`, states no figure, and is served a rate
     * for a *different* contract: the purchase would be exercised against the
     * pinned contract and priced off another one, which is not a price at all.
     * That is "there is no figure to use", not a disagreement to arbitrate.
     */
    private rateToPriceAt(
        params: PurchaseTrafficParams,
        servedRate: ConversionRateWithDisclosures | undefined,
        conversionRateCid: ContractIdString
    ): Numeric {
        if (params.conversionRate !== undefined) return params.conversionRate

        if (servedRate === undefined) {
            return this.ctx.error.throw({
                message:
                    'conversionRate is required to buy a stated trafficAmount. Pass it, or ' +
                    'pass paymasterApiUrl so the rate can be read off the paymaster.',
                type: 'BadRequest',
            })
        }
        if (servedRate.conversionRateId !== conversionRateCid) {
            return this.ctx.error.throw({
                message:
                    `conversionRateCid names ${conversionRateCid}, but the paymaster is ` +
                    `selling at ${servedRate.conversionRateId}. Pass conversionRate as well ` +
                    'to say what the pinned contract prices at, or drop conversionRateCid to ' +
                    'buy at the one on offer.',
                type: 'BadRequest',
            })
        }
        // Parsed rather than trusted: this figure goes straight into
        // `assetNeededFor`, and `'1e6'` would otherwise become a real transfer
        // request for an amount nobody asked for.
        return this.rethrowAsBadRequest(() =>
            damlDecimal(servedRate.conversionRate, 'the conversion rate')
        )
    }

    /** Reports a term that neither the caller nor the paymaster supplied. */
    private requireTerm(
        value: string | undefined,
        field: string
    ): asserts value is string {
        if (value === undefined) {
            this.ctx.error.throw({
                message:
                    `${field} is required, and neither the call nor the paymaster supplied ` +
                    'it. Pass it, or point paymasterApiUrl at a paymaster that reports it.',
                type: 'BadRequest',
            })
        }
    }

    /**
     * Notes a served rate that the ledger looks likely to refuse.
     *
     * Logged rather than thrown, deliberately. Both figures are the paymaster's
     * *off-ledger* view and are judged here against this machine's clock, so
     * refusing on them would be refusing on worse evidence than the ledger's --
     * which checks the same two things and reports them through `prepare`. The
     * warning only turns an opaque interpretation failure into something
     * greppable.
     */
    private warnOnStaleTerms(
        params: PurchaseTrafficParams,
        servedRate: ConversionRateWithDisclosures | undefined
    ): void {
        if (servedRate === undefined) return

        if (
            servedRate.expiresAt !== undefined &&
            Date.parse(servedRate.expiresAt) <= Date.now()
        ) {
            this.logger.warn(
                {
                    conversionRateCid: servedRate.conversionRateId,
                    expiresAt: servedRate.expiresAt,
                },
                'The paymaster served a conversion rate that has already expired; the ledger ' +
                    'will refuse to buy at it'
            )
        }

        if (
            params.trafficAmount !== undefined &&
            servedRate.maxTrafficPerPurchase !== undefined &&
            Number(params.trafficAmount) >
                Number(servedRate.maxTrafficPerPurchase)
        ) {
            this.logger.warn(
                {
                    trafficAmount: params.trafficAmount,
                    maxTrafficPerPurchase: servedRate.maxTrafficPerPurchase,
                },
                'The requested traffic exceeds the rate’s maxTrafficPerPurchase; the ' +
                    'ledger will refuse the purchase'
            )
        }
    }

    /**
     * The holdings to spend and what they cost, in the model's own two branches.
     *
     * Asked for a traffic amount, the cost is the asset needed for it at the
     * stated rate and holdings are selected to cover that. Asked for nothing, the
     * offered holdings are spent whole, so they have to be read for their
     * *amounts* rather than just their ids -- and the rate never enters it.
     */
    private async priceThePurchase(
        purchaseCtx: TrafficPurchaseContext,
        params: PurchaseTrafficParams,
        terms: PaymasterTerms,
        instrumentId: InstrumentId
    ): Promise<{ holdingCids: ContractIdString[]; assetAmount: Numeric }> {
        if (params.trafficAmount !== undefined) {
            const { trafficAmount } = params
            // Off the resolved terms rather than off `params`, because with a
            // `paymasterApiUrl` the figure may be the paymaster's.
            // `resolvePaymasterTerms` prices exactly this branch, so the
            // assertion only exists to fail loudly rather than silently if
            // that ever stops being true.
            const { conversionRate } = terms
            this.requireTerm(conversionRate, 'conversionRate')

            if (
                this.rethrowAsBadRequest(() => wholeBytes(trafficAmount)) !==
                trafficAmount
            ) {
                this.ctx.error.throw({
                    message:
                        `${trafficAmount} is not a whole number of bytes. Traffic is ` +
                        'counted in whole bytes, and the model rejects a fractional request.',
                    type: 'BadRequest',
                })
            }

            const assetAmount = this.rethrowAsBadRequest(() =>
                assetNeededFor(trafficAmount, conversionRate)
            )
            // With `inputUtxos` named this returns them as given -- unfiltered
            // and unchecked against the cost, the way `token.transfer.create`
            // also behaves. The model re-validates ownership, instrument and
            // sufficiency, so `prepare` is what rejects a bad selection.
            const holdingCids =
                await purchaseCtx.tokenStandardService.core.getInputHoldingsCids(
                    {
                        sender: params.purchaser,
                        instrumentAdmin: instrumentId.admin,
                        instrumentId: instrumentId.id,
                        inputUtxos: params.inputUtxos ?? [],
                        amount: new Decimal(assetAmount),
                    }
                )
            return { holdingCids, assetAmount }
        }

        const spendable = await this.spendableHoldings(
            purchaseCtx,
            params,
            instrumentId
        )
        if (spendable.length === 0) {
            this.ctx.error.throw({
                message: params.inputUtxos?.length
                    ? `None of the holdings named in inputUtxos are spendable ${instrumentId.id} ` +
                      `holdings owned by ${params.purchaser}.`
                    : `${params.purchaser} owns no spendable ${instrumentId.id} holdings to ` +
                      'pay with.',
                type: 'NotFound',
            })
        }

        return {
            holdingCids: spendable.map((holding) => holding.contractId),
            assetAmount: this.rethrowAsBadRequest(() =>
                sumAmounts(
                    spendable.map(
                        (holding) => holding.interfaceViewValue.amount
                    )
                )
            ),
        }
    }

    /**
     * The purchaser's unlocked holdings of one instrument, narrowed to the ones
     * the caller named.
     *
     * Locked holdings are dropped. `ConversionRate_ValidateAssets` does accept a
     * lock that has expired, but only the ledger knows the time that is judged
     * against, so offering one risks a rejection for a holding that was never
     * needed.
     */
    private async spendableHoldings(
        purchaseCtx: TrafficPurchaseContext,
        params: PurchaseTrafficParams,
        instrumentId: InstrumentId
    ): Promise<PrettyContract<HoldingView>[]> {
        const now = new Date()
        const holdings =
            await purchaseCtx.tokenStandardService.listContractsByInterface<HoldingView>(
                HOLDING_INTERFACE_ID,
                params.purchaser
            )

        // `CoreService` is internal to core-token-standard-service, so this
        // repeats its instrument filter rather than reaching into the package.
        const forInstrument = holdings
            .filter(
                (holding) => !TokenStandardService.isHoldingLocked(holding, now)
            )
            .filter(
                (holding) =>
                    holding.interfaceViewValue.instrumentId.id ===
                        instrumentId.id &&
                    holding.interfaceViewValue.instrumentId.admin ===
                        instrumentId.admin
            )

        const requested = params.inputUtxos
        if (requested === undefined || requested.length === 0) {
            return forInstrument
        }
        return forInstrument.filter((holding) =>
            requested.includes(holding.contractId)
        )
    }

    /**
     * Which factory settles the payment, and with what context.
     *
     * The transfer the registry is asked about mirrors the one
     * `TrafficPurchaser_PurchaseCredits` builds, so the context it prices is the
     * context the choice will use. That is also why the choice arguments are
     * assembled here rather than through the token-standard service's own
     * builder, which stamps a memo into `transfer.meta` that the model's
     * `emptyMetadata` does not carry.
     */
    private async resolveTransferFactory(
        purchaseCtx: TrafficPurchaseContext,
        params: PurchaseTrafficParams,
        terms: PaymasterTerms,
        instrumentId: InstrumentId,
        registryUrl: URL,
        holdingCids: ContractIdString[],
        assetAmount: Numeric,
        executeBefore: Date
    ): Promise<{
        factoryId: ContractIdString
        contextValues: TransferExtraArgs['context']['values']
        disclosedContracts: LedgerCommonSchemas['DisclosedContract'][]
    }> {
        const transfer: Transfer = {
            sender: params.purchaser,
            receiver: terms.paymasterReceiver,
            amount: assetAmount,
            instrumentId,
            requestedAt: new Date(
                Date.now() - REQUESTED_AT_SKEW_MS
            ).toISOString(),
            executeBefore: executeBefore.toISOString(),
            inputHoldingCids:
                holdingCids as unknown as Transfer['inputHoldingCids'],
            meta: { values: {} },
        }

        const { factoryId, transferKind, choiceContext } =
            await purchaseCtx.tokenStandardService.transfer.fetchTransferFactoryChoiceContext(
                registryUrl,
                {
                    expectedAdmin: instrumentId.admin,
                    transfer,
                    // Sent empty: filling the context in is the registry's half
                    // of the exchange.
                    extraArgs: {
                        context: { values: {} },
                        meta: { values: {} },
                    },
                }
            )

        if (transferKind === 'offer') {
            this.ctx.error.throw({
                message:
                    `The registry at ${registryUrl} would settle this payment as an offer ` +
                    'rather than a transfer, so it would not be paid in one step and the ' +
                    'purchase would be rejected. The receiver ' +
                    `${terms.paymasterReceiver} needs to pre-approve direct transfers of ` +
                    `${instrumentId.id}.`,
                type: 'BadRequest',
            })
        }

        return {
            factoryId,
            contextValues: contextValuesOf(choiceContext.choiceContextData),
            disclosedContracts: choiceContext.disclosedContracts,
        }
    }
}

/**
 * The `values` map out of a registry's choice context data.
 *
 * The context is a Daml `ChoiceContext`, i.e. a record with one `values` field,
 * but the registry's OpenAPI spec types it as an opaque object -- repeating the
 * Daml types there would only let them drift. So it is read rather than cast,
 * and a registry that sends no values is treated as sending none rather than as
 * broken.
 */
function contextValuesOf(
    choiceContextData: unknown
): TransferExtraArgs['context']['values'] {
    if (typeof choiceContextData !== 'object' || choiceContextData === null) {
        return {}
    }
    if (!('values' in choiceContextData)) return {}

    const values = choiceContextData.values
    if (typeof values !== 'object' || values === null) return {}
    return values as TransferExtraArgs['context']['values']
}
