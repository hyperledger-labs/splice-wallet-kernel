// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from '../sdk'
import { v4 } from 'uuid'
import { PartyId } from '@canton-network/core-types'
import {
    isJsCantonError,
    PrepareSubmissionResponse,
    Types,
} from '@canton-network/core-ledger-client'

export type RawCommandMap = {
    ExerciseCommand: Types['ExerciseCommand']
    CreateCommand: Types['CreateCommand']
    CreateAndExerciseCommand: Types['CreateAndExerciseCommand']
}
export type WrappedCommand<
    K extends keyof RawCommandMap = keyof RawCommandMap,
> = {
    [P in K]: { [Q in P]: RawCommandMap[P] }
}[K]

export class Ledger {
    constructor(private readonly sdkContext: WalletSdkContext) {}

    async prepare(options: {
        userId: string
        partyId: PartyId
        commands: WrappedCommand | WrappedCommand[] | unknown
        commandId?: string
        synchronizerId?: string
        disclosedContracts?: Types['DisclosedContract'][]
    }) {
        const synchronizerId =
            options.synchronizerId ||
            (await this.sdkContext.scanProxyClient.getAmuletSynchronizerId())

        if (!synchronizerId) {
            throw new Error(
                'No synchronizer ID provided and failed to fetch from scan proxy'
            )
        }

        const { userId, partyId, commands, commandId, disclosedContracts } =
            options

        const commandArray = Array.isArray(commands) ? commands : [commands]
        const prepareParams: Types['JsPrepareSubmissionRequest'] = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because OpenRPC codegen type is incompatible with ledger codegen type
            commands: commandArray as any,
            commandId: commandId || v4(),
            userId: userId,
            actAs: [partyId],
            readAs: [],
            disclosedContracts: disclosedContracts || [],
            synchronizerId,
            verboseHashing: false,
            packageIdSelectionPreference: [],
        }

        return this.sdkContext.ledgerClient.postWithRetry(
            '/v2/interactive-submission/prepare',
            prepareParams
        )
    }

    async execute(options: {
        prepared: PrepareSubmissionResponse
        signature: string
        submissionId?: string
        userId: string
        partyId: PartyId
    }) {
        const { prepared, signature, submissionId, userId, partyId } = options
        if (prepared.preparedTransaction === undefined) {
            throw new Error('preparedTransaction is undefined')
        }
        const transaction: string = prepared.preparedTransaction
        let replaceableSubmissionId = submissionId

        const fingerprint = partyId.split('::')[1]

        const request = {
            userId,
            preparedTransaction: transaction,
            hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
            submissionId: submissionId || v4(),
            deduplicationPeriod: {
                Empty: {},
            },
            partySignatures: {
                signatures: [
                    {
                        party: partyId,
                        signatures: [
                            {
                                signature,
                                signedBy: fingerprint,
                                format: 'SIGNATURE_FORMAT_CONCAT',
                                signingAlgorithmSpec:
                                    'SIGNING_ALGORITHM_SPEC_ED25519',
                            },
                        ],
                    },
                ],
            },
        }

        this.sdkContext.logger.info(
            { request },
            'Submitting transaction to ledger with request'
        )

        await this.sdkContext.ledgerClient
            .postWithRetry('/v2/interactive-submission/execute', request)
            .catch((e) => {
                if (
                    (isJsCantonError(e) &&
                        e.code === 'REQUEST_ALREADY_IN_FLIGHT') ||
                    e.code === 'SUBMISSION_ALREADY_IN_FLIGHT'
                ) {
                    //string format is Some(<uuid>)
                    const match =
                        e.context.existingSubmissionId.match(
                            /^Some\(([^)]+)\)$/
                        )
                    const uuid = match
                        ? match[1]
                        : e.context.existingSubmissionId

                    if (uuid.length === 0) {
                        //if we could not extract the UUID then we rethrow
                        throw e
                    }
                    replaceableSubmissionId = uuid
                } else {
                    throw e
                }
            })
        return replaceableSubmissionId
    }
}
