// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { OffLedger } from '@canton-network/core-token-standard'
import type { PartyId } from '@canton-network/core-types'
import { resolveCapabilities, type AssetBody } from '@canton-network/wallet-sdk'

export type Instrument =
    OffLedger.MetadataV1.components['schemas']['Instrument']

export type PortfolioInstrument = AssetBody & {
    name: string
    decimals: number
}

export const toPortfolioInstrument = ({
    instrument,
    admin,
    registryUrl,
}: {
    instrument: Instrument
    admin: PartyId
    registryUrl: string
}): PortfolioInstrument => ({
    id: instrument.id,
    admin,
    registryUrl: new URL(registryUrl),
    displayName: instrument.name,
    name: instrument.name,
    symbol: instrument.symbol,
    decimals: instrument.decimals,
    capabilities: resolveCapabilities({
        supportedApis: instrument.supportedApis,
    }),
})

export type Instruments = ReadonlyMap<PartyId, PortfolioInstrument[]>
