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

export function findAssetById(
    assets: Asset[],
    id: string,
    registryUrl: URL
): Asset | undefined {
    return assets.find(
        (asset) => asset.id === id && asset.registryUrl === registryUrl.href
    )
}
