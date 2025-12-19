// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { type Logger } from 'pino'
import {
    TokenStandardClient,
    type metadataRegistryTypes,
} from '@canton-network/core-token-standard'
import { PartyId } from '@canton-network/core-types'

export type RegistryUrls = ReadonlyMap<PartyId, string>
export type Instrument = metadataRegistryTypes['schemas']['Instrument']
export type Instruments = ReadonlyMap<PartyId, Instrument[]>

export interface RegistryService {
    registryUrls: RegistryUrls
    setRegistryUrl: (party: PartyId | undefined, url: string) => Promise<void>
    deleteRegistryUrl: (party: PartyId) => void
    addOnRegistryUrlsChangeListener: (
        _: (_: RegistryUrls) => void
    ) => () => void

    instruments: Instruments
    addOnInstrumentsChangeListener: (_: (_: Instruments) => void) => () => void
}

// Helper service for extracting token metadata from registries.
export class RegistryServiceImplementation {
    private logger: Logger
    private _registryUrls: Map<PartyId, string>
    private onRegistryUrlsChangeListeners: Set<(_: RegistryUrls) => void>
    private _instruments: Map<PartyId, Instrument[]>
    private onInstrumentsChangeListeners: Set<(_: Instruments) => void>

    constructor({
        logger,
        registryUrls,
    }: {
        logger: Logger
        registryUrls: RegistryUrls
    }) {
        this.logger = logger
        this._registryUrls = new Map(registryUrls)
        this.onRegistryUrlsChangeListeners = new Set()
        this._instruments = new Map()
        this.onInstrumentsChangeListeners = new Set()
        this.fetchInstruments() // Spawn off in background
    }

    get registryUrls(): RegistryUrls {
        return this._registryUrls
    }

    addOnRegistryUrlsChangeListener(
        listener: (urls: RegistryUrls) => void
    ): () => void {
        this.onRegistryUrlsChangeListeners.add(listener)
        return () => this.onRegistryUrlsChangeListeners.delete(listener)
    }

    private emitRegistryUrlsChange() {
        for (const f of this.onRegistryUrlsChangeListeners) f(this.registryUrls)
    }

    get instruments(): Instruments {
        return this._instruments
    }

    addOnInstrumentsChangeListener(
        listener: (instruments: Instruments) => void
    ): () => void {
        this.onInstrumentsChangeListeners.add(listener)
        return () => this.onInstrumentsChangeListeners.delete(listener)
    }

    private emitInstrumentsChange() {
        for (const f of this.onInstrumentsChangeListeners) f(this.instruments)
    }

    async setRegistryUrl(
        party: PartyId | undefined,
        url: string
    ): Promise<void> {
        if (!party) {
            this.logger.debug({ url }, 'no party specified, retrieving info')
            const tokenStandardClient = new TokenStandardClient(
                url,
                this.logger,
                false // isAdmin
            )
            const registryInfo = await tokenStandardClient.get(
                '/registry/metadata/v1/info'
            )
            party = registryInfo.adminId
        }
        this._registryUrls.set(party, url)
        this.emitRegistryUrlsChange()
        this.fetchInstrumentsForRegistry(party, url) // Spawn off in background
    }

    deleteRegistryUrl(party: PartyId) {
        this._registryUrls.delete(party)
        this.emitRegistryUrlsChange()
    }

    private async fetchInstruments(): Promise<void> {
        for (const [admin, registryUrl] of this.registryUrls) {
            if (!this.instruments.has(admin)) {
                await this.fetchInstrumentsForRegistry(admin, registryUrl)
            }
        }
    }

    private async fetchInstrumentsForRegistry(
        admin: PartyId,
        registryUrl: string
    ) {
        const instruments = []
        const tokenStandardClient = new TokenStandardClient(
            registryUrl,
            this.logger,
            false // isAdmin
        )
        let page = await tokenStandardClient.get(
            '/registry/metadata/v1/instruments'
        )
        instruments.push(...page.instruments)
        while (page.nextPageToken) {
            page = await tokenStandardClient.get(
                '/registry/metadata/v1/instruments',
                {
                    query: { pageToken: page.nextPageToken },
                }
            )
            instruments.push(...page.instruments)
        }
        this._instruments.set(admin, instruments)
        this.emitInstrumentsChange()
    }
}
