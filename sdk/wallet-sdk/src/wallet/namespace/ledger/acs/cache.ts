// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { ContractId } from '@canton-network/core-token-standard'
import { SDKContext } from '../../../sdk.js'
import { LedgerNamespace } from '../namespace.js'
import { ACSReader } from './reader.js'
import { ACS_UPDATE_CONFIG, ACSKey, ACSState } from './types.js'
import { JsGetActiveContractsResponse } from '@canton-network/core-ledger-client-types'

export class ACSCacheNamespace {
    private readonly state: ACSState = {
        initial: {
            offset: 0,
            acs: [],
        },
        updates: {
            offset: 0,
            allACs: [],
        },
        archivedACs: new Set(),
    }
    private readonly acsReader: ACSReader
    private readonly ledger: LedgerNamespace
    constructor(private readonly sdkContext: SDKContext) {
        this.acsReader = new ACSReader(sdkContext)
        this.ledger = new LedgerNamespace(sdkContext)
    }

    private get initial() {
        return this.state.initial
    }

    private get updates() {
        return this.state.updates
    }

    private async initState(args: { offset: number; key: ACSKey }) {
        const { offset, key } = args
        const initialAcs = await this.acsReader.readRaw({
            offset,
            parties: key.parties ?? [],
            interfaceIds: key.interfaceIds ?? [],
            templateIds: key.templateIds ?? [],
        })
        this.state.initial = {
            offset,
            acs: initialAcs,
        }
        this.state.updates = {
            offset,
            allACs: [],
        }
        this.state.archivedACs = new Set()
    }

    public async update(args: { offset: number; key: ACSKey }) {
        const { offset } = args

        if (!this.initial.acs.length || this.initial.offset > offset) {
            await this.initState(args)
        }

        // get updates, then events, then set the new acsset

        if (
            this.updates.allACs.length >= ACS_UPDATE_CONFIG.maxEventsBeforePrune
        ) {
            this.rebuildCache()
        }
    }

    public calculateAt(offset: number) {
        if (!this.initial.acs)
            this.sdkContext.error.throw({
                message: 'No ACS initialized. Call `.update()` first',
                type: 'Unexpected',
            })
        if (this.initial.offset > offset)
            this.sdkContext.error.throw({
                message: 'Provided offset cannot be smaller than ACS offset',
                type: 'Unexpected',
            })

        const newContracts: JsGetActiveContractsResponse[] = []
        const newArchivedContracts: Set<ContractId<string>> = new Set()

        this.updates.allACs
            .filter((ac) => ac.offset <= offset)
            .map((ac) => {
                if (ac.archived) {
                    newArchivedContracts.add(
                        ac.event.contractId as ContractId<string>
                    )
                    return
                }
                newContracts.push({
                    workflowId: ac.workflowId ?? '',
                    contractEntry: {
                        JsActiveContract: {
                            createdEvent: ac.event,
                            synchronizerId: ac.synchronizerId ?? '',
                            reassignmentCounter: 0,
                        },
                    },
                })
            })

        const allContracts = this.initial.acs.concat(newContracts)
        this.state.archivedACs =
            this.state.archivedACs.union(newArchivedContracts)

        return allContracts.filter(({ contractEntry }) => {
            if (!contractEntry) return false
            const id =
                ('JsActiveContract' in contractEntry &&
                    contractEntry.JsActiveContract.createdEvent.contractId) ??
                ''

            return !this.state.archivedACs.has(id)
        })
    }

    private rebuildCache() {
        // TODO: fill this
    }
}
