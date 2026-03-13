// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from '../../sdk.js'
import { v4 } from 'uuid'
import { PrepareOptions, ExecuteOptions } from './types.js'
import { type PrepareSubmissionResponse } from '@canton-network/core-ledger-client'
import { PreparedTransaction } from '../transactions/prepared.js'
import { SignedTransaction } from '../transactions/signed.js'
import { Ops } from '@canton-network/core-provider-ledger'
import { Dar } from './dar/client.js'

export class Ledger {
    public readonly dar: Dar
    constructor(private readonly sdkContext: WalletSdkContext) {
        this.dar = new Dar(sdkContext)
    }

    /**
     * Performs the prepare step of the interactive submission flow.
     * @returns PreparedTransaction which includes the response from the ledger and an execute function that can be called with a SignedTransaction to perform the execute step of the interactive submission flow.
     */
    prepare(options: PrepareOptions): PreparedTransaction {
        const preparePromise = this.sdkContext.scanProxyClient
            .getAmuletSynchronizerId()
            .then((response) => {
                const synchronizerId = options.synchronizerId || response

                if (!synchronizerId) {
                    this.sdkContext.error.throw({
                        message:
                            'No synchronizer ID provided and failed to fetch from scan proxy',
                        type: 'NotFound',
                    })
                }

                const { partyId, commands, commandId, disclosedContracts } =
                    options

                const commandArray = Array.isArray(commands)
                    ? commands
                    : [commands]
                const prepareParams: Ops.PostV2InteractiveSubmissionPrepare['ledgerApi']['params']['body'] =
                    {
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

                return this.sdkContext.ledgerProvider.request<Ops.PostV2InteractiveSubmissionPrepare>(
                    {
                        method: 'ledgerApi',
                        params: {
                            resource: '/v2/interactive-submission/prepare',
                            body: prepareParams,
                            requestMethod: 'post',
                        },
                    }
                )
            })

        return new PreparedTransaction(
            this.sdkContext,
            preparePromise,
            (signed, opts) => this.execute(signed, opts)
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
    ): Promise<
        Ops.PostV2InteractiveSubmissionExecuteAndWait['ledgerApi']['result']
    > {
        const { submissionId, partyId } = options
        const signedResponse = await signed.response()
        if (signedResponse.preparedTransaction === undefined) {
            this.sdkContext.error.throw({
                message: 'preparedTransaction is undefined',
                type: 'SDKOperationUnsupported',
            })
        }

        const transaction: string = signedResponse.preparedTransaction
        const replaceableSubmissionId = submissionId ?? v4()

        const fingerprint = partyId.split('::')[1]

        const request = {
            userId: this.sdkContext.userId,
            preparedTransaction: transaction,
            hashingSchemeVersion:
                'HASHING_SCHEME_VERSION_V2' as Ops.PostV2InteractiveSubmissionExecuteAndWait['ledgerApi']['params']['body']['hashingSchemeVersion'],
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
                                signature: await signed.signature(),
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

        return this.sdkContext.ledgerProvider.request<Ops.PostV2InteractiveSubmissionExecuteAndWait>(
            {
                method: 'ledgerApi',
                params: {
                    resource: '/v2/interactive-submission/executeAndWait',
                    body: request,
                    requestMethod: 'post',
                },
            }
        )
    }

    /**
     * For offline signing workflows, construct a SignedTransaction from an externally produced signature.
     * @param response The prepare response from a previous prepare call
     * @param signature The externally produced signature
     * @returns A SignedTransaction that can be passed to execute()
     */
    fromSignature(
        response: PrepareSubmissionResponse,
        signature: string
    ): SignedTransaction {
        const signPromise = Promise.resolve({
            response,
            signature,
        })
        return new SignedTransaction(
            this.sdkContext,
            signPromise,
            (signed, opts) => this.execute(signed, opts)
        )
    }
}
