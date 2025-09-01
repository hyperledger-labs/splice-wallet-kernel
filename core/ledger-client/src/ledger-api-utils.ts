// Copyright (c) 2024 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import crypto from 'crypto'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import {
    AllKnownMetaKeys,
    HoldingInterface,
    matchInterfaceIds,
    TransferInstructionInterface,
} from './constants.js'
import { components } from './generated-clients/openapi-3.3.0-SNAPSHOT.js'
import { LedgerClient } from './ledger-client.js'
import { Holding, TransferInstructionView } from './txparse/types.js'

type TransactionFilter = components['schemas']['TransactionFilter']
type CreatedEvent = components['schemas']['CreatedEvent']
type ExercisedEvent = components['schemas']['ExercisedEvent']
type ArchivedEvent = components['schemas']['ArchivedEvent']
type ExerciseCommand = components['schemas']['ExerciseCommand']
type JsInterfaceView = components['schemas']['JsInterfaceView']
export type JsPrepareSubmissionRequest =
    components['schemas']['JsPrepareSubmissionRequest']
export type DisclosedContract = components['schemas']['DisclosedContract']
type PartySignatures = components['schemas']['PartySignatures']
type Command = components['schemas']['Command']
type DeduplicationPeriod2 = components['schemas']['DeduplicationPeriod2']

export function filtersByParty(
    party: string,
    interfaceNames: string[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    includeWildcard: boolean
): TransactionFilter['filtersByParty'] {
    return {
        [party]: {
            cumulative: interfaceNames.map((interfaceName) => {
                return {
                    identifierFilter: {
                        InterfaceFilter: {
                            value: {
                                interfaceId: interfaceName,
                                includeInterfaceView: true,
                                includeCreatedEventBlob: true,
                            },
                        },
                    },
                }
            }),
            // .concat(
            //     includeWildcard
            //         ? [
            //             {
            //                 identifierFilter: {
            //                     WildcardFilter: {
            //                         value: {
            //                             includeCreatedEventBlob: true,
            //                         },
            //                     },
            //                 },
            //             },
            //         ]
            //         : [],
            // ),
        },
    }
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
    } else if (matchInterfaceIds(HoldingInterface, interfaceView.interfaceId)) {
        return {
            type: 'Holding',
            viewValue: interfaceView.viewValue as Holding,
        }
    } else if (
        matchInterfaceIds(
            TransferInstructionInterface,
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

export function mergeMetas(event: ExercisedEvent): Meta {
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

export async function submitExerciseCommand(
    ledgerClient: LedgerClient,
    exerciseCommand: ExerciseCommand,
    disclosedContracts: DisclosedContract[],
    partyId: string,
    userId: string,
    publicKeyPath: string,
    privateKeyPath: string
): Promise<Completion> {
    const submissionId = randomUUID()
    const commandId = `tscli-${randomUUID()}`

    const command: Command = {
        ExerciseCommand: exerciseCommand,
    }

    const synchronizerId =
        getSynchronizerIdFromDisclosedContracts(disclosedContracts)

    const prepared = await ledgerClient.post(
        '/v2/interactive-submission/prepare',
        {
            actAs: [partyId],
            readAs: [partyId],
            userId: userId,
            commandId,
            synchronizerId,
            commands: [command],
            disclosedContracts,
            verboseHashing: true,
            packageIdSelectionPreference: [],
        }
    )

    const signed = signTransaction(
        publicKeyPath,
        privateKeyPath,
        prepared.preparedTransactionHash
    )
    const partySignatures: PartySignatures = {
        signatures: [
            {
                party: partyId,
                signatures: [
                    {
                        signature: signed.signedHash,
                        signedBy: signed.signedBy,
                        format: 'SIGNATURE_FORMAT_RAW',
                        signingAlgorithmSpec: 'SIGNING_ALGORITHM_SPEC_ED25519',
                    },
                ],
            },
        ],
    }

    const deduplicationPeriod: DeduplicationPeriod2 = {
        Empty: {},
    }

    const ledgerEnd = await ledgerClient.get('/v2/state/ledger-end')

    await ledgerClient.post('/v2/interactive-submission/execute', {
        userId,
        submissionId,
        preparedTransaction: prepared.preparedTransaction!,
        hashingSchemeVersion: prepared.hashingSchemeVersion,
        partySignatures,
        deduplicationPeriod,
    })

    const completionPromise = awaitCompletion(
        ledgerClient,
        ledgerEnd.offset,
        partyId,
        userId,
        commandId,
        submissionId
    )
    return promiseWithTimeout(
        completionPromise,
        45_000 * 2, // 45s
        `Timed out getting completion for submission with userId=${userId}, commandId=${commandId}, submissionId=${submissionId}.
    The submission might have succeeded or failed, but it couldn't be determined in time.`
    )
}

// The synchronizer id is mandatory, so we derive it from the disclosed contracts,
// expecting that they'll all be in the same synchronizer
function getSynchronizerIdFromDisclosedContracts(
    disclosedContracts: DisclosedContract[]
): string {
    const synchronizerId = disclosedContracts[0].synchronizerId
    const differentSynchronizerId = disclosedContracts.find(
        (dc) => dc.synchronizerId !== synchronizerId
    )
    if (differentSynchronizerId) {
        throw new Error(
            `Contract is in a different domain so can't submit to the correct synchronizer: ${JSON.stringify(
                differentSynchronizerId
            )}`
        )
    }
    return synchronizerId
}

interface SignTransactionResult {
    signedBy: string
    // base64 encoded
    signedHash: string
}
function signTransaction(
    publicKeyPath: string,
    privateKeyPath: string,
    preparedTransactionHash: string
): SignTransactionResult {
    const publicKey = readFileSync(publicKeyPath)
    const nodePublicKey = crypto.createPublicKey({
        key: publicKey,
        format: 'der',
        type: 'spki', // pycryptodome exports public keys as SPKI
    })

    const privateKey = readFileSync(privateKeyPath)
    const nodePrivateKey = crypto.createPrivateKey({
        key: privateKey,
        format: 'der',
        type: 'pkcs8',
    })

    const keyFingerprint = crypto
        .createHash('sha256')
        .update(
            Buffer.from(
                `0000000C${nodePublicKey
                    .export({ format: 'der', type: 'spki' })
                    // Ed25519 public key is the last 32 bytes of the SPKI DER key
                    .subarray(-32)
                    .toString('hex')}`,
                'hex'
            )
        )
        .digest('hex')
    const fingerprintPreFix = '1220' // 12 PublicKeyFingerprint, 20 is a special length encoding
    const signedBy = `${fingerprintPreFix}${keyFingerprint}`

    const hashBuffer = Buffer.from(preparedTransactionHash, 'base64')
    const signedHash = crypto
        .sign(null, hashBuffer, {
            key: nodePrivateKey,
            dsaEncoding: 'ieee-p1363',
        })
        .toString('base64')

    return {
        signedBy,
        signedHash,
    }
}

export interface Completion {
    updateId: string
    // the openAPI definition claims these two can be null
    synchronizerId: string | undefined
    recordTime: string | undefined
}

// TODO: awaitCompletion loop
// const COMPLETIONS_LIMIT = 100
// const COMPLETIONS_STREAM_IDLE_TIMEOUT_MS = 1000

/**
 * Polls the completions endpoint until
 * the completion with the given (userId, commandId, submissionId) is returned.
 * Then returns the updateId, synchronizerId and recordTime of that completion.
 */
async function awaitCompletion(
    ledgerClient: LedgerClient,
    ledgerEnd: number,
    partyId: string,
    userId: string,
    commandId: string,
    submissionId: string
): Promise<Completion> {
    const responses = await ledgerClient.post('/v2/commands/completions', {
        userId,
        parties: [partyId],
        beginExclusive: ledgerEnd,
    })

    const completions = responses.filter(
        (response) => !!response.completionResponse.Completion
    )

    const wantedCompletion = completions.find((response) => {
        const completion = response.completionResponse.Completion
        if (!completion) return false
        return (
            completion.value.userId === userId &&
            completion.value.commandId === commandId &&
            completion.value.submissionId === submissionId
        )
    })

    if (wantedCompletion) {
        const completion = wantedCompletion.completionResponse.Completion!
        const status = completion.value.status
        if (status && status.code !== 0) {
            // status.code is 0 for success
            throw new Error(
                `Command failed with status: ${JSON.stringify(status)}`
            )
        }
        return {
            synchronizerId: completion.value.synchronizerTime?.synchronizerId,
            recordTime: completion.value.synchronizerTime?.recordTime,
            updateId: completion.value.updateId,
        }
    } else {
        const lastCompletion = completions[completions.length - 1]
        const newLedgerEnd =
            lastCompletion?.completionResponse.Completion!.value.offset
        return awaitCompletion(
            ledgerClient,
            newLedgerEnd || ledgerEnd, // !newLedgerEnd implies response was empty
            partyId,
            userId,
            commandId,
            submissionId
        )
    }
}

async function promiseWithTimeout<T>(
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
