// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { WalletSdkContext } from '../sdk.js'
import { v4 } from 'uuid'
import { PrepareOptions, ExecuteOptions } from './types.js'
import { Types } from '@canton-network/core-ledger-client'
import { PreparedTransaction } from '../transactions/prepared.js'
import { SignedTransaction } from '../transactions/signed.js'
import { Ops } from '@canton-network/core-provider-ledger'

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

        const response =
            await this.sdkContext.ledgerProvider.request<Ops.PostV2InteractiveSubmissionPrepare>(
                {
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/interactive-submission/prepare',
                        body: prepareParams,
                        requestMethod: 'post',
                    },
                }
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
    ): Promise<
        Ops.PostV2InteractiveSubmissionExecuteAndWait['ledgerApi']['result']
    > {
        const { submissionId, partyId } = options
        if (signed.response.preparedTransaction === undefined) {
            throw new Error('preparedTransaction is undefined')
        }

        const transaction: string = signed.response.preparedTransaction
        const replaceableSubmissionId = submissionId ?? v4()

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

        const version =
            await this.sdkContext.ledgerProvider.request<Ops.GetV2Version>({
                method: 'ledgerApi',
                params: {
                    resource: '/v2/version',
                    requestMethod: 'get',
                },
            })

        if (!version.version.includes('3.4')) {
            this.sdkContext.logger.error(
                `Ledger version is ${version.version}, expected 3.4. Please upgrade to 3.4 to use this command.`
            )

            throw new Error('Unsupported ledger version')
        }

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
}
