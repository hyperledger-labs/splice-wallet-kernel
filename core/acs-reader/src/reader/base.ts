// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    AbstractLedgerProvider,
    Ops,
} from '@canton-network/core-provider-ledger'
import type {
    ACSCacheCollection,
    PaginatedACSCacheCollection,
} from '../cache/collection/collection'
import {
    type AcsOptions,
    type PaginatedAcsOptions,
    AcsService,
    type PaginatedResolvedAcsOptions,
    type ResolvedAcsOptions,
} from '../service'
import type { LedgerCommonSchemas } from '@canton-network/core-ledger-client-types'
import type { ACSCacheCollectionOptions } from '../cache/collection'

export abstract class BaseReader<
    Options extends AcsOptions | PaginatedAcsOptions,
> {
    protected cacheCollection: ACSCacheCollection | PaginatedACSCacheCollection
    protected service: AcsService
    constructor(
        protected readonly ledger: AbstractLedgerProvider,
        protected readonly cacheOptions?: ACSCacheCollectionOptions
    ) {
        this.cacheCollection = this.createCacheCollection()
        this.service = new AcsService(ledger)
    }

    /**
     * Creates the appropriate cache collection for this reader.
     *
     * @internal For internal use only.
     * @returns The cache collection instance
     */
    protected abstract createCacheCollection():
        | ACSCacheCollection
        | PaginatedACSCacheCollection

    /**
     * Reads active contracts from the cache.
     */
    public async read(options: Options) {
        const resolvedOptions = await this.resolveAcsOptions(options)
        return await this.cacheCollection.readFromCache(resolvedOptions)
    }

    /**
     * Convenience method that returns active contracts as JS contract objects.
     */
    public async readJsContracts(options: Options) {
        return this.readJsContractsWith(await this.read(options))
    }

    /**
     * Extracts active contracts from various output formats (single page, array of pages, or array of responses).
     */
    private getActiveContracts(
        output:
            | LedgerCommonSchemas['JsGetActiveContractsResponse'][]
            | LedgerCommonSchemas['JsGetActiveContractsPageResponse']
            | LedgerCommonSchemas['JsGetActiveContractsPageResponse'][]
    ): LedgerCommonSchemas['JsGetActiveContractsResponse'][] {
        // Handle single page response
        if (!Array.isArray(output)) {
            return 'activeContracts' in output ? output.activeContracts : []
        }

        // Handle array of pages vs array of responses
        if (output.length > 0 && 'activeContracts' in output[0]) {
            return output.flatMap((page) =>
                'activeContracts' in page ? page.activeContracts : []
            )
        }

        return output.filter(
            (
                item
            ): item is LedgerCommonSchemas['JsGetActiveContractsResponse'] =>
                !('activeContracts' in item)
        )
    }

    /**
     * Transforms active contracts output into JS contract objects with created event details and synchronizer ID.
     */
    private readJsContractsWith(output: Awaited<ReturnType<typeof this.read>>) {
        const contracts = this.getActiveContracts(output)

        return contracts
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
    }

    /**
     * Resolves ACS options by ensuring an offset is present, fetching the current ledger end if needed.
     */
    protected async resolveAcsOptions(
        options: Options
    ): Promise<
        Options extends PaginatedAcsOptions
            ? PaginatedResolvedAcsOptions
            : ResolvedAcsOptions
    > {
        const offset =
            options.offset ??
            (
                await this.ledger.request<Ops.GetV2StateLedgerEnd>({
                    method: 'ledgerApi',
                    params: {
                        resource: '/v2/state/ledger-end',
                        requestMethod: 'get',
                        query: {},
                    },
                })
            ).offset!

        return { ...options, offset }
    }
}
