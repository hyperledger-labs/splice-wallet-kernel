// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AcsOptions } from '@canton-network/core-acs-reader'
import { v3_4 } from '@canton-network/core-ledger-client-types'
import { Ops } from '@canton-network/core-provider-ledger'
import { LedgerTypes, SDKContext } from '../../../sdk.js'
import { AcsRequestOptions } from '../types.js'

export class ACSReader {
    constructor(protected readonly sdkContext: SDKContext) {}

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
    public async readRaw(
        options: AcsRequestOptions
    ): Promise<Array<LedgerTypes['JsGetActiveContractsResponse']>> {
        const resolvedOptions = await this.resolveAcsOptions(options)

        this.sdkContext.logger.debug(
            resolvedOptions,
            `Querying acs with options:`
        )

        const activeContracts =
            await this.sdkContext.acsReader.getActiveContracts(resolvedOptions)

        return activeContracts
    }

    /**
     * Queries the ACS and filters for JsActiveContracts
     * @param options AcsOptions for querying the Active Contract Set (ACS).
     * returns the createdEvent and synchronizerId
     */
    public async read(options: AcsRequestOptions) {
        return (await this.readRaw(options))

            .filter(
                (acs) =>
                    acs.contractEntry != null &&
                    'JsActiveContract' in acs.contractEntry
            )
            .map((acs) => {
                const jsActiveContract = (
                    acs.contractEntry as {
                        JsActiveContract: v3_4.components['schemas']['JsActiveContract']
                    }
                ).JsActiveContract

                return {
                    ...jsActiveContract.createdEvent,
                    synchronizerId: jsActiveContract.synchronizerId,
                }
            })
    }

    protected async resolveAcsOptions(
        options: AcsRequestOptions
    ): Promise<AcsOptions> {
        const offset =
            options.offset ??
            (
                await this.sdkContext.ledgerProvider.request<Ops.GetV2StateLedgerEnd>(
                    {
                        method: 'ledgerApi',
                        params: {
                            resource: '/v2/state/ledger-end',
                            requestMethod: 'get',
                        },
                    }
                )
            ).offset!

        return { ...options, offset }
    }
}
