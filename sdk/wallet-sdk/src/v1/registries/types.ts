// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'

export type Asset = {
    id: string
    displayName: string
    symbol: string
    registryUrl: string
    admin: PartyId
}

export function findAsset(
    assets: Asset[],
    id: string,
    registryUrl?: URL
): Asset {
    const asset = registryUrl
        ? assets.filter(
              (asset) =>
                  asset.id === id && asset.registryUrl === registryUrl?.href
          )
        : assets.filter((asset) => asset.id === id)

    if (asset.length === 0) {
        throw new Error(`Asset with id ${id} not found`)
    }

    if (asset.length > 1) {
        throw new Error(
            `Multiple assets with id ${id}, please provide a registryUrl`
        )
    }
    return asset[0]
}
