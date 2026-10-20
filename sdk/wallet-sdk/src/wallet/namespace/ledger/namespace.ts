// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'
import type { SDKContext } from '../../init/types/context.js'
import type {
    PrepareOptions,
    ExecuteOptions,
    AcsRequestOptions,
} from './types.js'
import { PreparedTransaction } from '../transactions/prepared.js'
import { SignedTransaction } from '../transactions/signed.js'
import type { Ops } from '@canton-network/core-provider-ledger'
import { InternalLedgerNamespace } from './internal/index.js'
import { ACSReader } from '@canton-network/core-acs-reader'
import { DarNamespace } from './dar/index.js'
import { SynchronizerResolver } from '../../init/synchronizer.js'

export class LedgerNamespace {
    public readonly dar: DarNamespace
    public readonly internal: InternalLedgerNamespace
    public readonly acsReader: ACSReader

    constructor(private readonly sdkContext: SDKContext) {
        this.dar = new DarNamespace(sdkContext)
        this.internal = new InternalLedgerNamespace(sdkContext)
        this.acsReader = new ACSReader(sdkContext.ledgerProvider)
    }

    /**
     * Returns connected synchronizers visible to the caller, optionally filtered
     * by party, participant, or identity provider.
     *
     * Uses the Ledger API endpoint GET /v2/state/connected-synchronizers.
     */
    public async connectedSynchronizers(
        options?: Ops.GetV2StateConnectedSynchronizers['ledgerApi']['params']['query']
    ) {
        this.sdkContext.logger.debug(
            { options },
            'Fetching connected synchronizers'
        )

        return SynchronizerResolver.fetchConnectedSynchronizers(
            this.sdkContext.ledgerProvider,
            options
        )
    }

    public async ledgerEnd() {
        return (
            await this.sdkContext.ledgerProvider.request<Ops.GetV2StateLedgerEnd>(
                {
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/state/ledger-end',
                        requestMethod: 'get',
                        query: {},
                    },
                }
            )
        ).offset!
    }
    /**
     * Performs the prepare step of the interactive submission flow.
     * @returns PreparedTransaction which includes the response from the ledger and an execute function that can be called with a SignedTransaction to perform the execute step of the interactive submission flow.
     */
    public prepare(options: PrepareOptions): PreparedTransaction {
        const preparePromise = async () => {
            const synchronizerId =
                await SynchronizerResolver.requireSynchronizerId(
                    this.sdkContext,
                    options.synchronizerId
                )

            const {
                partyId,
                commands,
                commandId = crypto.randomUUID(),
                disclosedContracts = [],
            } = options

            const commandArray = Array.isArray(commands) ? commands : [commands]

            return this.internal.prepare({
                commands: commandArray,
                commandId,
                actAs: [partyId],
                disclosedContracts,
                synchronizerId,
            })
        }

        return new PreparedTransaction(
            this.sdkContext,
            preparePromise(),
            (signed, opts) => this.execute(signed, opts)
        )
    }

    /**
     * Performs the execute step of the interactive submission flow.
     * @param signed The signed transaction to be executed, which includes the signature and the original prepare response from the ledger.
     * @param options The options for executing the transaction, including userId, partyId, and an optional submissionId.
     * @returns The submissionId of the executed transaction.
     */
    public async execute(
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
        const replaceableSubmissionId = submissionId ?? crypto.randomUUID()

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
    public fromSignature(
        response: Ops.PostV2InteractiveSubmissionPrepare['ledgerApi']['result'],
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

    /**
     * @deprecated use `acsReader` namespace instead
     */
    acs = {
        /**
         *
         * @param options AcsOptions for querying the Active Contract Set (ACS).
         * offset: The ledger offset at which to query the ACS. If not provided, will fetch the ledgerEnd.
         * templateIds: An optional array of template IDs to filter the ACS by. If not provided, no filtering by template ID will be applied.
         * parties: An optional array of party IDs to filter the ACS by. If not provided, no filtering by party will be applied.
         * filterByParty: A boolean flag indicating whether to apply party-based filtering. If true, the query will filter contracts based on the specified parties. If false or not provided, party-based filtering will not be applied.
         * interfaceIds: An optional array of interface IDs to filter the ACS by. If not provided, no filtering by interface ID will be applied.
         * limit: An optional number specifying the maximum number of active contracts to return in a single query. If not provided, the default limit will be determined by the ledger API.
         * continueUntilCompletion: A boolean flag indicating whether to continue polling the ledger until the query is complete. If true, the method will repeatedly query the ledger until all matching active contracts have been retrieved. If false or not provided, the method will return after a single query, which may return a
         * @returns Active contracts matching the provided query options.
         */
        readRaw: async (
            options: AcsRequestOptions
        ): Promise<
            Array<LedgerCommonSchemas['JsGetActiveContractsResponse']>
        > => {
            this.sdkContext.logger.debug(options, `Querying acs with options:`)

            return await this.acsReader.raw.read(options)
        },
        /**
         * Queries the ACS and filters for JsActiveContracts
         * @param options AcsOptions for querying the Active Contract Set (ACS).
         * returns the createdEvent and synchronizerId
         */
        read: async (options: AcsRequestOptions) => {
            return (await this.acs.readRaw(options))

                .filter(
                    (acs) =>
                        acs.contractEntry != null &&
                        'JsActiveContract' in acs.contractEntry
                )
                .map((acs) => {
                    const jsActiveContract = (
                        acs.contractEntry as {
                            JsActiveContract: LedgerCommonSchemas['JsActiveContract']
                        }
                    ).JsActiveContract

                    return {
                        ...jsActiveContract.createdEvent,
                        synchronizerId: jsActiveContract.synchronizerId,
                    }
                })
        },
        /**
         * Queries the ACS and returns the first matching contract, throwing if none is found.
         * @param options AcsOptions for querying the Active Contract Set (ACS).
         * @throws {SDKError} When no matching contract is found.
         */
    }
}
