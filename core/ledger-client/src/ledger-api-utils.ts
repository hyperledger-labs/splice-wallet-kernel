// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AllKnownMetaKeys, matchInterfaceIds } from './constants.js'
import { LedgerClient } from './ledger-client.js'
import { Holding, TransferInstructionView } from './txparse/types.js'
import { Types } from './ledger-client.js'
import { PartyId } from '@canton-network/core-types'
import {
    HOLDING_INTERFACE_ID,
    TRANSFER_INSTRUCTION_INTERFACE_ID,
} from '@canton-network/core-token-standard'
import { Logger } from '@canton-network/core-types'
import { ErrorInfo, RetryInfo } from '@canton-network/core-ledger-proto'

type TransactionFilter = Types['TransactionFilter']
type EventFormat = Types['EventFormat']
type CreatedEvent = Types['CreatedEvent']
type ExercisedEvent = Types['ExercisedEvent']
type ArchivedEvent = Types['ArchivedEvent']
type JsInterfaceView = Types['JsInterfaceView']
type Completion = Types['Completion']['value']
export type JSContractEntry = Types['JsContractEntry']
export type JsCantonError = Types['JsCantonError']

type BaseFilterOptions = {
    includeWildcard?: boolean
    isMasterUser?: boolean
    partyId?: PartyId | undefined
}

type FilterIdentifiers =
    | {
          templateIds: string[] | string
          interfaceIds?: never
      }
    | {
          interfaceIds: string[] | string
          templateIds?: never
      }

type TransactionFilterOptions = BaseFilterOptions & FilterIdentifiers

type EventFilterOptions = TransactionFilterOptions & { verbose?: boolean }

function createIdentiferFilter(type: 'Template' | 'Interface', id: string) {
    if (type === 'Template') {
        return {
            identifierFilter: {
                TemplateFilter: {
                    value: {
                        templateId: id,
                        includeCreatedEventBlob: true,
                    },
                },
            },
        }
    } else {
        return {
            identifierFilter: {
                InterfaceFilter: {
                    value: {
                        interfaceId: id,
                        includeInterfaceView: true,
                        includeCreatedEventBlob: true,
                    },
                },
            },
        }
    }
}

function createWildcardFilter() {
    return {
        identifierFilter: {
            WildcardFilter: {
                value: {
                    includeCreatedEventBlob: true,
                },
            },
        },
    }
}

function buildCumulativeFilters(
    templateIds: string[],
    interfaceIds: string[],
    includeWildcard: boolean
) {
    if (templateIds.length > 0) {
        return [
            ...templateIds.map((templateId) =>
                createIdentiferFilter('Template', templateId)
            ),
            ...(includeWildcard ? [createWildcardFilter()] : []),
        ]
    } else {
        return [
            ...interfaceIds.map((interfaceId) =>
                createIdentiferFilter('Interface', interfaceId)
            ),
            ...(includeWildcard ? [createWildcardFilter()] : []),
        ]
    }
}

function buildFilter<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends { filtersByParty?: any; filtersForAnyParty?: any },
>(
    templateIds: string[],
    interfaceIds: string[],
    options: BaseFilterOptions,
    additionalProps?: Partial<T>
): T {
    const { isMasterUser = false, partyId, includeWildcard = false } = options

    if (isMasterUser) {
        return {
            filtersByParty: {},
            filtersForAnyParty: filtersForAnyParty(
                templateIds,
                interfaceIds,
                includeWildcard
            ),
            ...additionalProps,
        } as T
    }

    if (!partyId) {
        throw new Error('Party must be provided for non-master users')
    }

    return {
        filtersByParty: filtersByParty(
            partyId,
            templateIds,
            interfaceIds,
            includeWildcard
        ),
        ...additionalProps,
    } as T
}

export function TransactionFilterBySetup(
    options: TransactionFilterOptions
): TransactionFilter {
    const { templateIds, interfaceIds, ...baseOptions } = options
    return buildFilter<TransactionFilter>(
        normalizeToArray(templateIds || []),
        normalizeToArray(interfaceIds || []),
        baseOptions
    )
}

export function EventFilterBySetup(options: EventFilterOptions): EventFormat {
    const {
        templateIds,
        interfaceIds,
        verbose = false,
        ...baseOptions
    } = options
    return buildFilter<EventFormat>(
        normalizeToArray(templateIds || []),
        normalizeToArray(interfaceIds || []),
        baseOptions,
        { verbose }
    )
}

function filtersByParty(
    party: PartyId,
    templateIds: string[],
    interfaceIds: string[],
    includeWildcard: boolean
): TransactionFilter['filtersByParty'] {
    return {
        [party]: {
            cumulative: buildCumulativeFilters(
                templateIds,
                interfaceIds,
                includeWildcard
            ),
        },
    }
}

function filtersForAnyParty(
    interfaceNames: string[],
    templateIds: string[],
    includeWildcard: boolean
): TransactionFilter['filtersForAnyParty'] {
    return {
        cumulative: buildCumulativeFilters(
            templateIds,
            interfaceNames,
            includeWildcard
        ),
    }
}

function normalizeToArray<T>(value: T | T[]): T[] {
    return Array.isArray(value) ? value : [value]
}

export function hasInterface(
    interfaceId: string,
    event: ExercisedEvent | ArchivedEvent
): boolean {
    return (event.implementedInterfaces || []).some((id) =>
        matchInterfaceIds(id, interfaceId)
    )
}

export function getInterfaceView(
    createdEvent: CreatedEvent
): JsInterfaceView | null {
    const interfaceViews = createdEvent.interfaceViews || null
    return (interfaceViews && interfaceViews[0]) || null
}

export type KnownInterfaceView =
    | { type: 'Holding'; viewValue: Holding }
    | { type: 'TransferInstruction'; viewValue: TransferInstructionView }

export function getKnownInterfaceView(
    createdEvent: CreatedEvent
): KnownInterfaceView | null {
    const interfaceView = getInterfaceView(createdEvent)
    if (!interfaceView) {
        return null
    } else if (
        matchInterfaceIds(HOLDING_INTERFACE_ID, interfaceView.interfaceId)
    ) {
        return {
            type: 'Holding',
            viewValue: interfaceView.viewValue as Holding,
        }
    } else if (
        matchInterfaceIds(
            TRANSFER_INSTRUCTION_INTERFACE_ID,
            interfaceView.interfaceId
        )
    ) {
        return {
            type: 'TransferInstruction',
            viewValue: interfaceView.viewValue as TransferInstructionView,
        }
    } else {
        return null
    }
}

// TODO (#563): handle allocations in such a way that any callers have to handle them too
/**
 * Use this when `createdEvent` is guaranteed to have an interface view because the ledger api filters
 * include it, and thus is guaranteed to be returned by the API.
 */
export function ensureInterfaceViewIsPresent(
    createdEvent: CreatedEvent,
    interfaceId: string
): JsInterfaceView {
    const interfaceView = getInterfaceView(createdEvent)
    if (!interfaceView) {
        throw new Error(
            `Expected to have interface views, but didn't: ${JSON.stringify(
                createdEvent
            )}`
        )
    }
    if (!matchInterfaceIds(interfaceId, interfaceView.interfaceId)) {
        throw new Error(
            `Not a ${interfaceId} but a ${
                interfaceView.interfaceId
            }: ${JSON.stringify(createdEvent)}`
        )
    }
    return interfaceView
}

type Meta = { values: { [key: string]: string } } | undefined

export function mergeMetas(event: ExercisedEvent, extra?: Meta): Meta {
    // Add a type assertion to help TypeScript understand the shape of choiceArgument
    const choiceArgument = event.choiceArgument as
        | {
              transfer?: { meta?: Meta }
              extraArgs?: { meta?: Meta }
              meta?: Meta
          }
        | undefined

    const lastWriteWins = [
        choiceArgument?.transfer?.meta,
        choiceArgument?.extraArgs?.meta,
        choiceArgument?.meta,
        extra,
        (event.exerciseResult as { meta?: Meta } | undefined)?.meta,
    ]
    const result: { [key: string]: string } = {}
    lastWriteWins.forEach((meta) => {
        const values: { [key: string]: string } = meta?.values || {}
        Object.entries(values).forEach(([k, v]) => {
            result[k] = v
        })
    })
    if (Object.keys(result).length === 0) {
        return undefined
    }
    // order of keys doesn't matter, but we return it consistent for test purposes (and it's nicer)
    else {
        return { values: result }
    }
}

export function getMetaKeyValue(key: string, meta: Meta): string | null {
    return (meta?.values || {})[key] || null
}

/**
 * From the view of making it easy to build the display for the wallet,
 * we remove all metadata fields that were fully parsed, and whose content is reflected in the TypeScript structure.
 * Otherwise, the display code has to do so, overloading the user with superfluous metadata entries.
 */
export function removeParsedMetaKeys(meta: Meta): Meta {
    return {
        values: Object.fromEntries(
            Object.entries(meta?.values || {}).filter(
                ([k]) => !AllKnownMetaKeys.includes(k)
            )
        ),
    }
}

const COMPLETIONS_LIMIT = '100'
const COMPLETIONS_STREAM_IDLE_TIMEOUT_MS = '1000'

/**
 * Polls the completions endpoint until
 * the completion with the given (userId, commandId, submissionId) is returned.
 * Then returns the updateId, synchronizerId and recordTime of that completion.
 */
export async function awaitCompletion(
    ledgerClient: LedgerClient,
    ledgerEnd: number,
    partyId: PartyId,
    userId: string,
    commandIdOrSubmissionId: string
): Promise<Completion> {
    const responses = await ledgerClient.postWithRetry(
        '/v2/commands/completions',
        {
            userId,
            parties: [partyId],
            beginExclusive: ledgerEnd,
        },
        defaultRetryableOptions,
        {
            query: {
                limit: COMPLETIONS_LIMIT,
                stream_idle_timeout_ms: COMPLETIONS_STREAM_IDLE_TIMEOUT_MS,
            },
        }
    )

    const completions = responses.filter(
        (r) => 'Completion' in r.completionResponse
    )

    const wantedCompletion = responses.find((r) => {
        if ('Completion' in r.completionResponse) {
            const completion = r.completionResponse.Completion.value
            return (
                completion.userId === userId &&
                (completion.commandId === commandIdOrSubmissionId ||
                    completion.submissionId === commandIdOrSubmissionId)
            )
        }
        return false
    })

    if (
        wantedCompletion &&
        'Completion' in wantedCompletion.completionResponse
    ) {
        const completion = wantedCompletion.completionResponse.Completion.value
        const status = completion.status
        if (status && status.code !== 0) {
            // status.code is 0 for success
            throw asGrpcError(status)
        }
        return completion
    } else {
        const lastCompletion = completions[completions.length - 1]
        const newLedgerEnd =
            lastCompletion && 'Completion' in lastCompletion.completionResponse
                ? lastCompletion.completionResponse.Completion.value.offset
                : undefined

        return awaitCompletion(
            ledgerClient,
            newLedgerEnd || ledgerEnd, // !newLedgerEnd implies response was empty
            partyId,
            userId,
            commandIdOrSubmissionId
        )
    }
}

export async function promiseWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
): Promise<T> {
    let timeoutPid: NodeJS.Timeout | null = null
    const timeoutPromise: Promise<T> = new Promise((_resolve, reject) => {
        timeoutPid = setTimeout(() => reject(errorMessage), timeoutMs)
    })

    try {
        return await Promise.race([promise, timeoutPromise])
    } finally {
        if (timeoutPid) {
            clearTimeout(timeoutPid)
        }
    }
}

export type retryableOptions = {
    retries: number
    delayMs: number
    cantonErrorKeys: string[]
}
export const defaultRetryableOptions: retryableOptions = {
    retries: 5,
    delayMs: 3000,
    cantonErrorKeys: [
        'SEQUENCER_REQUEST_FAILED',
        'SEQUENCER_BACKPRESSURE',
        'SUBMISSION_ALREADY_IN_FLIGHT',
        'LOCAL_VERDICT_TIMEOUT',
        'NOT_SEQUENCED_TIMEOUT',
        'NO_VIEW_WITH_VALID_RECIPIENTS',
    ],
}

export async function retryable<T>(
    fn: () => Promise<T>,
    retryableOptions: retryableOptions,
    logger?: Logger
): Promise<T> {
    for (let attempts = 1; attempts <= retryableOptions.retries; attempts++) {
        try {
            return await fn()
        } catch (err: unknown) {
            const grpcError = asGrpcError(err)
            const message: string = grpcError.message
            const shouldRetry =
                retryableOptions.cantonErrorKeys.length === 0 ||
                retryableOptions.cantonErrorKeys.some((key) =>
                    message.includes(key)
                )
            if (attempts < retryableOptions.retries && shouldRetry) {
                logger?.warn(
                    `Caught retryiable error: ${message}. Retrying attempt ${attempts} of ${retryableOptions.retries}...`
                )
                await new Promise((res) =>
                    setTimeout(res, retryableOptions.delayMs)
                )
                // continue to next attempt
            } else {
                throw grpcError
            }
        }
    }
    throw new Error('retryable: Exceeded maximum retries without throwing.')
}

// Helper for differentiating ledger errors from others and satisfying TS when checking error properties
export const isJsCantonError = (e: unknown): e is JsCantonError =>
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    'cause' in e &&
    'errorCategory' in e

export const asJsCantonError = (e: unknown): JsCantonError => {
    if (isJsCantonError(e)) {
        return e
    } else {
        throw e
    }
}

export const asGrpcError = (
    e: unknown
): {
    code: number
    message: string
    errorInfo: ErrorInfo | undefined
    retryInfo: RetryInfo | undefined
} => {
    let errorInfo: ErrorInfo | undefined = undefined
    let retryInfo: RetryInfo | undefined = undefined
    let code = 500
    let message = (e as Error)?.message || ''
    if (typeof e === 'object' && e !== null && 'cause' in e) {
        message = e.cause as string
    } else if (typeof e === 'object' && e !== null && 'message' in e) {
        message = e.message as string
    }
    if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        'message' in e &&
        'details' in e &&
        Array.isArray(e.details)
    ) {
        code = e.code as number
        message = e.message as string
        for (const detail of e.details) {
            if (
                detail.typeUrl === 'type.googleapis.com/google.rpc.ErrorInfo' &&
                typeof detail.value === 'string'
            ) {
                try {
                    errorInfo = ErrorInfo.fromBinary(
                        Buffer.from(detail.value, 'base64')
                    )
                } catch {
                    //if parsing fails, we skip adding ErrorInfo
                }
            } else if (
                detail.typeUrl === 'type.googleapis.com/google.rpc.RetryInfo' &&
                typeof detail.value === 'string'
            ) {
                try {
                    retryInfo = RetryInfo.fromBinary(
                        Buffer.from(detail.value, 'base64')
                    )
                } catch {
                    //if parsing fails, we skip adding RetryInfo
                }
            }
        }
    } else {
        // Not a gRPC error, rethrow
        throw e
    }
    // Fallback: just return the error message
    return { code: code, message: message, errorInfo, retryInfo }
}
