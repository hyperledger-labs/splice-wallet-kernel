// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from '../sdk.js'
import { v4 } from 'uuid'
import { PrepareOptions, ExecuteOptions } from './types.js'
import {
    isJsCantonError,
    Types,
    awaitCompletion,
    promiseWithTimeout,
} from '@canton-network/core-ledger-client'
import { PreparedTransaction } from '../transactions/prepared.js'
import { SignedTransaction } from '../transactions/signed.js'

export class Ledger {
    constructor(private readonly sdkContext: WalletSdkContext) {}

    /**
     * Performs the prepare step of the interactive submission flow.
     * @returns PreparedTransaction which includes the response from the ledger and an execute function that can be called with a SignedTransaction to perform the execute step of the interactive submission flow.
     */
    async prepare(options: PrepareOptions): Promise<PreparedTransaction> {
        const synchronizerId =
            options.synchronizerId ||
            (await this.sdkContext.scanProxyClient.getAmuletSynchronizerId())

        if (!synchronizerId) {
            throw new Error(
                'No synchronizer ID provided and failed to fetch from scan proxy'
            )
        }

        const { partyId, commands, commandId, disclosedContracts } = options

        const commandArray = Array.isArray(commands) ? commands : [commands]
        const prepareParams: Types['JsPrepareSubmissionRequest'] = {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- because OpenRPC codegen type is incompatible with ledger codegen type
            commands: commandArray as any,
            commandId: commandId || v4(),
            userId: this.sdkContext.userId,
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

    /**
     * Performs the execute step of the interactive submission flow.
     * @param signed The signed transaction to be executed, which includes the signature and the original prepare response from the ledger.
     * @param options The options for executing the transaction, including userId, partyId, and an optional submissionId.
     * @returns The submissionId of the executed transaction.
     */
    async execute(
        signed: SignedTransaction,
        options: ExecuteOptions
    ): Promise<Types['Completion']['value']> {
        const { submissionId, partyId } = options
        if (signed.response.preparedTransaction === undefined) {
            throw new Error('preparedTransaction is undefined')
        }

        const ledgerEnd = await this.sdkContext.ledgerClient.getWithRetry(
            '/v2/state/ledger-end'
        )

        const ledgerEndNumber: number =
            typeof ledgerEnd === 'number' ? ledgerEnd : ledgerEnd.offset

        const transaction: string = signed.response.preparedTransaction
        let replaceableSubmissionId = submissionId ?? v4()

        const fingerprint = partyId.split('::')[1]

        const request = {
            userId: this.sdkContext.userId,
            preparedTransaction: transaction,
            hashingSchemeVersion: 'HASHING_SCHEME_VERSION_V2',
            submissionId: replaceableSubmissionId,
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

        // TODO: use /v2/interactive-submission/executeAndWait endpoint. This is only available in 3.4, we will switch the endpoint once the LedgerProvider is implemented (rather than the core-ledger-client) #799

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

        const completionPromise = awaitCompletion(
            this.sdkContext.ledgerClient,
            ledgerEndNumber,
            partyId,
            this.sdkContext.userId,
            replaceableSubmissionId
        )

        return promiseWithTimeout(
            completionPromise,
            1000 * 60,
            `Waiting for transaction completion timed out for submissionId ${replaceableSubmissionId}`
        )
    }
}
