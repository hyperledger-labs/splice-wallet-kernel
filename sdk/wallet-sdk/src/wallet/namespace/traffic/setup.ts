// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Setting a ledger up to sell traffic, as a convergence rather than a creation.
 *
 * The ledger is meant to hold one `TrafficPurchaser` per paymaster and one
 * `ConversionRate` per instrument that paymaster accepts. Neither template has
 * a contract key -- LF 2 has none to give -- so nothing on the ledger enforces
 * that, and creating unconditionally is how a second call ends up with a buyer
 * choosing between two purchasers and two prices for one instrument.
 *
 * So a setup reads what is there, works out the difference, and plans only
 * that: creating what is missing, repricing through `ConversionRate_Update`
 * what has changed, and leaving alone what already matches. Calling it twice
 * with the same arguments plans nothing at all.
 *
 * This module is the pure half -- the template encoding, the decoders that read
 * either template back off the ledger, what counts as the same rate, and the
 * planner. It holds no `SDKContext`, the way `pricing.ts` does not, so a
 * refusal leaves here as a plain `Error` and `TrafficAccountNamespace`
 * translates it into an `SDKError`.
 *
 * What it deliberately does not do is self-heal. Reading and planning are
 * separate from submitting, so two setups running at once against one paymaster
 * can still both create. The repricing half is safe -- exercising a choice on a
 * contract the other call consumed is rejected, which is optimistic concurrency
 * for free -- but the creating half is not, and nothing available closes it:
 * there is no key to make a create conditional. So a paymaster with two
 * purchasers, or an instrument with two live rates, is refused with both
 * contract ids named rather than resolved by guessing: picking one would hand
 * different buyers a different contract, and archiving the extra would break
 * whoever cached a disclosure of it.
 */

import type { WrappedCommand } from '@canton-network/core-ledger-client-types'
import type { InstrumentId } from '@canton-network/core-token-standard'
import {
    ConversionRate,
    TrafficPurchaser,
    type ConversionRate_Update,
} from '@canton-network/core-traffic-purchase'
import type { Numeric, PartyId } from '@canton-network/core-types'
import { damlDecimal, sameDecimal, sameInstant } from './pricing.js'
import type {
    ActiveConversionRate,
    ActiveTrafficPurchaser,
    ActiveTrafficSetup,
    ContractIdString,
    ConversionRateSpec,
    SetupStatus,
    SetupTrafficParams,
    TrafficSetupPlan,
    TrafficSetupRate,
} from './types.js'

/** What a setup plans, before the disclosures are gathered for it. */
export type SetupPlan = Omit<TrafficSetupPlan, 'disclosedContracts'>

/** A command a setup plans: creating a contract, or repricing a rate. */
type SetupCommand = WrappedCommand<'CreateCommand' | 'ExerciseCommand'>

/**
 * The part of a create event this module reads.
 *
 * Structural rather than the Ledger API's `CreatedEvent`, so the ACS reader and
 * a transaction's events both fit without either side importing the other's
 * shape.
 */
export type CreatedContract = {
    templateId: string
    contractId: string
    createArgument?: unknown
}

/**
 * The qualified name of a template id, i.e. everything from the first colon on.
 *
 * Commands name a template in package-*name* form
 * (`#traffic-purchase-models:Tea.TrafficPurchase:ConversionRate`), which is what
 * the generated companions carry and what resolves to whichever version of the
 * model the participant has vetted. Events name the *resolved package id*
 * instead, so they can only be matched on the rest.
 */
function qualifiedNameOf(templateId: string): string {
    return templateId.slice(templateId.indexOf(':'))
}

const conversionRateQualifiedName = qualifiedNameOf(ConversionRate.templateId)
const trafficPurchaserQualifiedName = qualifiedNameOf(
    TrafficPurchaser.templateId
)

/** Whether an event's `templateId` is a `ConversionRate`, whatever its package. */
export function isConversionRate(templateId: string): boolean {
    return templateId.endsWith(conversionRateQualifiedName)
}

/** Whether an event's `templateId` is a `TrafficPurchaser`, whatever its package. */
export function isTrafficPurchaser(templateId: string): boolean {
    return templateId.endsWith(trafficPurchaserQualifiedName)
}

/** An instrument as a value that can be compared and used as a map key. */
export function instrumentKey(instrumentId: InstrumentId): string {
    return JSON.stringify([instrumentId.admin, instrumentId.id])
}

/**
 * The instrument named by a create event's arguments, if they name one.
 *
 * The arguments come back as unconstrained JSON -- the Ledger API spec gives
 * them no schema -- so they are read defensively rather than cast.
 */
export function instrumentOf(
    createArgument: unknown
): InstrumentId | undefined {
    const record = asRecord(createArgument)
    if (record === undefined) return undefined

    const instrumentId = asRecord(record.instrumentId)
    if (instrumentId === undefined) return undefined
    if (
        typeof instrumentId.admin !== 'string' ||
        typeof instrumentId.id !== 'string'
    ) {
        return undefined
    }

    return { admin: instrumentId.admin, id: instrumentId.id }
}

/**
 * The rate a create event's arguments describe, if they describe one.
 *
 * Defensive rather than cast, the way `instrumentOf` is. A Daml `None` arrives
 * either as `null` or as an absent key depending on the endpoint, and both
 * become `undefined`, so an absent optional has exactly one representation on
 * this side -- two would leave `sameConversionRate` reporting a difference
 * forever and repricing a rate on every call.
 */
export function conversionRateOf(
    contractId: ContractIdString,
    createArgument: unknown
): ActiveConversionRate | undefined {
    const instrumentId = instrumentOf(createArgument)
    if (instrumentId === undefined) return undefined

    const record = asRecord(createArgument)
    if (record === undefined) return undefined
    if (typeof record.conversionRate !== 'string') return undefined

    const expiresAt = asOptionalString(record.expiresAt)
    if (expiresAt === malformed) return undefined
    const maxTrafficPerPurchase = asOptionalString(record.maxTrafficPerPurchase)
    if (maxTrafficPerPurchase === malformed) return undefined

    return {
        contractId,
        instrumentId,
        conversionRate: record.conversionRate,
        ...(expiresAt === undefined ? {} : { expiresAt }),
        ...(maxTrafficPerPurchase === undefined
            ? {}
            : { maxTrafficPerPurchase }),
    }
}

/**
 * The party a purchaser's arguments say payments go to, if they say.
 *
 * Absent is not an error: a purchaser whose receiver cannot be decoded still
 * exists, and still has to count as the paymaster's one purchaser.
 */
export function paymasterReceiverOf(
    createArgument: unknown
): PartyId | undefined {
    const record = asRecord(createArgument)
    if (record === undefined) return undefined
    return typeof record.paymasterReceiver === 'string'
        ? record.paymasterReceiver
        : undefined
}

/**
 * Sorts a paymaster's active contracts into the two templates.
 *
 * The paymaster is the sole signatory of both, so a read already filtered to it
 * is enough to say the contracts are this paymaster's -- there is nothing
 * further to check in the arguments. Anything that is neither template is
 * ignored rather than refused, since a wider read is a caller's business.
 */
export function trafficSetupOf(
    paymaster: PartyId,
    contracts: CreatedContract[]
): ActiveTrafficSetup {
    const trafficPurchasers: ActiveTrafficPurchaser[] = []
    const conversionRates: ActiveConversionRate[] = []

    for (const contract of contracts) {
        if (isTrafficPurchaser(contract.templateId)) {
            const paymasterReceiver = paymasterReceiverOf(
                contract.createArgument
            )
            trafficPurchasers.push({
                contractId: contract.contractId,
                ...(paymasterReceiver === undefined
                    ? {}
                    : { paymasterReceiver }),
            })
            continue
        }
        if (!isConversionRate(contract.templateId)) continue

        const rate = conversionRateOf(
            contract.contractId,
            contract.createArgument
        )
        // A rate that does not decode must not pass for one that is not there:
        // that would price its instrument a second time, which is the very
        // thing converging is for.
        if (rate === undefined) {
            throw new Error(
                `Failed to read the traffic setup of ${paymaster}: the ConversionRate ` +
                    `${contract.contractId} does not look like one this SDK knows`
            )
        }
        conversionRates.push(rate)
    }

    return { trafficPurchasers, conversionRates }
}

/**
 * The difference between what the ledger says and what the params ask for.
 *
 * Pure: it decides, it does not submit. Creates and exercises come back in one
 * list, so a setup takes effect whole or not at all -- a purchaser with no rate
 * sells nothing, and a rate with no purchaser cannot be bought at.
 */
export function planTrafficSetup(
    existing: ActiveTrafficSetup,
    params: SetupTrafficParams
): SetupPlan {
    const { paymaster } = params
    assertSetupParams(params)

    const commands: SetupCommand[] = []
    const purchaser = resolvePurchaser(existing.trafficPurchasers, params)
    if (purchaser.create !== undefined) commands.push(purchaser.create)

    const ratesByInstrument = new Map<string, ActiveConversionRate[]>()
    for (const rate of existing.conversionRates) {
        const key = instrumentKey(rate.instrumentId)
        ratesByInstrument.set(key, [
            ...(ratesByInstrument.get(key) ?? []),
            rate,
        ])
    }

    const conversionRates = params.conversionRates.map(
        (wanted): TrafficSetupRate => {
            const live =
                ratesByInstrument.get(instrumentKey(wanted.instrumentId)) ?? []
            // Only the instruments this call names are checked. A duplicate
            // somewhere else is someone else's rate to sort out, and refusing
            // over it would block a call that has nothing to do with it.
            if (live.length > 1) {
                throw new Error(
                    `Failed to plan a traffic setup for paymaster ${paymaster}: instrument ` +
                        `${wanted.instrumentId.id} of ${wanted.instrumentId.admin} is priced by ` +
                        `more than one live ConversionRate ` +
                        `(${live.map((rate) => rate.contractId).join(', ')}), so which one to ` +
                        'reprice is ambiguous. Archive the others with ConversionRate_Archive.'
                )
            }

            const current = live[0]
            if (current === undefined) {
                commands.push({
                    CreateCommand: {
                        templateId: ConversionRate.templateId,
                        createArguments: conversionRateArguments(
                            paymaster,
                            wanted
                        ),
                    },
                })
                return { instrumentId: wanted.instrumentId, status: 'created' }
            }
            if (sameConversionRate(current, wanted)) {
                return {
                    instrumentId: wanted.instrumentId,
                    status: 'unchanged',
                    contractId: current.contractId,
                }
            }
            commands.push({
                ExerciseCommand: {
                    templateId: ConversionRate.templateId,
                    contractId: current.contractId,
                    choice: ConversionRate.ConversionRate_Update.choiceName,
                    choiceArgument: conversionRateUpdateArguments(wanted),
                },
            })
            return { instrumentId: wanted.instrumentId, status: 'updated' }
        }
    )

    return {
        paymaster,
        commands,
        trafficPurchaser: {
            ...(purchaser.contractId === undefined
                ? {}
                : { contractId: purchaser.contractId }),
            status: purchaser.status,
        },
        conversionRates,
    }
}

/** The purchaser to sell through: the paymaster's own, or one to create. */
function resolvePurchaser(
    existing: ActiveTrafficPurchaser[],
    params: SetupTrafficParams
): {
    contractId?: ContractIdString
    status: SetupStatus
    create?: SetupCommand
} {
    const reuse = pickPurchaser(existing, params)
    if (reuse !== undefined) {
        assertReceiverMatches(params.paymaster, reuse, params.paymasterReceiver)
        return { contractId: reuse.contractId, status: 'unchanged' }
    }

    return {
        status: 'created',
        create: {
            CreateCommand: {
                templateId: TrafficPurchaser.templateId,
                createArguments: {
                    paymaster: params.paymaster,
                    // A provider may collect payment somewhere other than the
                    // selling party, but by default it does not.
                    paymasterReceiver:
                        params.paymasterReceiver ?? params.paymaster,
                } satisfies TrafficPurchaser,
            },
        },
    }
}

/**
 * The one existing purchaser to reuse, or `undefined` when there is none.
 *
 * Two purchasers is refused rather than resolved. Picking one -- the oldest,
 * say -- would hand different buyers a different purchaser depending on which
 * version of this SDK ran, and would bury a split brain somebody needs to know
 * about; archiving the extra would break whichever buyers had already cached a
 * disclosure of it. `trafficPurchaser` is the way out, which is why that param
 * survives discovery.
 */
function pickPurchaser(
    existing: ActiveTrafficPurchaser[],
    params: SetupTrafficParams
): ActiveTrafficPurchaser | undefined {
    if (params.trafficPurchaser !== undefined) {
        const named = existing.find(
            (purchaser) => purchaser.contractId === params.trafficPurchaser
        )
        if (named === undefined) {
            throw new Error(
                `Failed to plan a traffic setup for paymaster ${params.paymaster}: ` +
                    `${params.trafficPurchaser} is not an active TrafficPurchaser of that paymaster`
            )
        }
        return named
    }

    if (existing.length > 1) {
        throw new Error(
            `Failed to plan a traffic setup for paymaster ${params.paymaster}: it has more ` +
                `than one TrafficPurchaser ` +
                `(${existing.map((purchaser) => purchaser.contractId).join(', ')}), so which ` +
                'one buyers should exercise is ambiguous. Name one with the trafficPurchaser ' +
                'param, and archive the others as the paymaster.'
        )
    }
    return existing[0]
}

/**
 * Refuses a purchaser that pays somewhere other than where the caller asked.
 *
 * Only checked when the caller said where: no `paymasterReceiver` means no
 * opinion, and comparing against the default instead would start refusing every
 * repeat call that once named a receiver and then left it out.
 *
 * `TrafficPurchaser` has no choice that moves its receiver -- unlike a rate,
 * which has `ConversionRate_Update` -- so this cannot be converged. Changing it
 * means archiving the purchaser, which changes the contract id every buyer's
 * disclosure names, and that is the caller's decision to take deliberately.
 */
function assertReceiverMatches(
    paymaster: PartyId,
    purchaser: ActiveTrafficPurchaser,
    wanted: PartyId | undefined
): void {
    if (wanted === undefined) return
    if (purchaser.paymasterReceiver === wanted) return

    const current =
        purchaser.paymasterReceiver ?? 'a party that could not be read'
    throw new Error(
        `Failed to plan a traffic setup for paymaster ${paymaster}: its TrafficPurchaser ` +
            `${purchaser.contractId} pays ${current}, not the requested ${wanted}. The ` +
            'template cannot move the receiver, so changing it means archiving that purchaser ' +
            "as the paymaster and setting up again -- which invalidates every buyer's " +
            'disclosure of it.'
    )
}

/**
 * Everything wrong with the params that the ledger's own state cannot excuse.
 *
 * Separate from the checks `planTrafficSetup` makes against what is already
 * there, and exported so a caller can be refused before a setup spends a round
 * trip reading an ACS it is never going to use. `planTrafficSetup` runs it too,
 * so the pure module holds the invariant rather than trusting its callers.
 *
 * Two specs for one instrument leave the price a purchase pays ambiguous, and a
 * call could not converge them: whichever was applied second would decide.
 */
export function assertSetupParams(params: SetupTrafficParams): void {
    const { paymaster, conversionRates } = params
    if (conversionRates.length === 0) {
        throw new Error(
            `Failed to plan a traffic setup for paymaster ${paymaster}: no conversion rates given`
        )
    }

    const seen = new Set<string>()
    for (const rate of conversionRates) {
        const key = instrumentKey(rate.instrumentId)
        if (seen.has(key)) {
            throw new Error(
                `Failed to plan a traffic setup for paymaster ${paymaster}: two conversion ` +
                    `rates for instrument ${rate.instrumentId.id} of ${rate.instrumentId.admin}`
            )
        }
        seen.add(key)
    }
}

/** The create arguments for one rate, as the model declares them. */
function conversionRateArguments(
    paymaster: PartyId,
    spec: ConversionRateSpec
): ConversionRate {
    return {
        paymaster,
        instrumentId: spec.instrumentId,
        conversionRate: damlDecimal(spec.conversionRate, 'the conversion rate'),
        // A Daml `Optional` is the value itself, or null for `None`.
        expiresAt: spec.expiresAt?.toISOString() ?? null,
        maxTrafficPerPurchase: optionalDecimal(spec.maxTrafficPerPurchase),
    }
}

/**
 * The arguments `ConversionRate_Update` takes to make a rate say what a spec
 * says.
 *
 * Encoded exactly as `conversionRateArguments` encodes the same three fields,
 * since they end up in the same record: a repriced rate has to be
 * indistinguishable from one created with that spec in the first place, or the
 * next call would see a difference and reprice it again.
 */
function conversionRateUpdateArguments(
    spec: ConversionRateSpec
): ConversionRate_Update {
    return {
        newConversionRate: damlDecimal(
            spec.conversionRate,
            'the conversion rate'
        ),
        newExpiresAt: spec.expiresAt?.toISOString() ?? null,
        newMaxTrafficPerPurchase: optionalDecimal(spec.maxTrafficPerPurchase),
    }
}

function optionalDecimal(value: Numeric | undefined): Numeric | null {
    return value === undefined
        ? null
        : damlDecimal(value, 'the maximum traffic per purchase')
}

/**
 * Whether a rate on the ledger already says what a spec asks for.
 *
 * `instrumentId` is not compared: a rate's instrument cannot be changed, so the
 * caller has already matched the two on it.
 */
export function sameConversionRate(
    onLedger: ActiveConversionRate,
    wanted: ConversionRateSpec
): boolean {
    return (
        sameDecimal(
            onLedger.conversionRate,
            damlDecimal(wanted.conversionRate, 'the conversion rate')
        ) &&
        sameOptional(onLedger.expiresAt, wanted.expiresAt, sameInstant) &&
        sameOptional(
            onLedger.maxTrafficPerPurchase,
            wanted.maxTrafficPerPurchase,
            (ledger, value) =>
                sameDecimal(
                    ledger,
                    damlDecimal(value, 'the maximum traffic per purchase')
                )
        )
    )
}

/**
 * Compares two Daml `Optional`s, one side as the ledger renders it.
 *
 * Both absent is equal, one absent is a difference. Shared by `expiresAt` and
 * `maxTrafficPerPurchase` so the two cannot drift apart: getting this wrong in
 * one of them reprices a rate on every call, and only for callers who left that
 * field out.
 */
function sameOptional<T>(
    onLedger: string | undefined,
    wanted: T | undefined,
    same: (onLedger: string, wanted: T) => boolean
): boolean {
    if (onLedger === undefined) return wanted === undefined
    if (wanted === undefined) return false
    return same(onLedger, wanted)
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return undefined
    }
    return value as Record<string, unknown>
}

/**
 * Marks a value that is present but is not a string, so `undefined` can keep
 * meaning "absent, i.e. Daml `None`" without a second sentinel.
 */
const malformed = Symbol('malformed')

function asOptionalString(
    value: unknown
): string | undefined | typeof malformed {
    if (value === null || value === undefined) return undefined
    return typeof value === 'string' ? value : malformed
}
