// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from '../sdk'
import { v4 } from 'uuid'
// import { PartyId } from '@canton-network/core-types'
import { PrepareOptions, ExecuteOptions } from './types'
import {
    isJsCantonError,
    // PrepareSubmissionResponse,
    Types,
} from '@canton-network/core-ledger-client'
import { PreparedTransaction } from '../transactions/prepared'
import { SignedTransaction } from '../transactions/signed'
// import { signTransactionHash } from '@canton-network/core-signing-lib'

// export type PrepareOptions = {
//     userId: string
//     partyId: PartyId
//     commands: WrappedCommand | WrappedCommand[] | unknown
//     commandId?: string
//     synchronizerId?: string
//     disclosedContracts?: Types['DisclosedContract'][]
// }

// export type ExecuteOptions = {
//     submissionId?: string
//     userId: string
//     partyId: PartyId
// }

// export type RawCommandMap = {
//     ExerciseCommand: Types['ExerciseCommand']
//     CreateCommand: Types['CreateCommand']
//     CreateAndExerciseCommand: Types['CreateAndExerciseCommand']
// }
// export type WrappedCommand<
//     K extends keyof RawCommandMap = keyof RawCommandMap,
// > = {
//     [P in K]: { [Q in P]: RawCommandMap[P] }
// }[K]

export class Ledger {
    constructor(private readonly sdkContext: WalletSdkContext) {}

    async prepare(options: PrepareOptions) {
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

        const response = await this.sdkContext.ledgerClient.postWithRetry(
            '/v2/interactive-submission/prepare',
            prepareParams
        )

        return new PreparedTransaction(response, (signed, opts) =>
            this.execute(signed, opts)
        )
    }

    async execute(
        signed: SignedTransaction,
        options: ExecuteOptions
    ): Promise<string> {
        const { submissionId, userId, partyId } = options
        if (signed.response.preparedTransaction === undefined) {
            throw new Error('preparedTransaction is undefined')
        }

        const transaction: string = signed.response.preparedTransaction
        let replaceableSubmissionId = submissionId ?? v4()

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
                                signature: signed.signature,
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

        this.sdkContext.logger.debug(
            { request },
            'Submitting transaction to ledger with request'
        )

        // TODO: use /v2/interactive-submission/executeAndWait endpoint. This is only available in 3.4, we will switch the endpoint once the LedgerProvider is implemented (rather than the core-ledger-client)
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
