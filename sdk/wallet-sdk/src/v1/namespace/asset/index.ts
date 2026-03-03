// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { PartyId } from '@canton-network/core-types'
import { SDKErrorHandler } from 'src/v1/error'

export type AssetBody = {
    id: string
    displayName: string
    symbol: string
    registryUrl: string
    admin: PartyId
}

export type AssetContext = {
    tokenStandardService: TokenStandardService
    registries: URL[]
    error: SDKErrorHandler
}

export class Asset {
    constructor(private readonly ctx: AssetContext) {}

    public async list(): Promise<AssetBody[]> {
        return await this.ctx.tokenStandardService.registriesToAssets(
            this.ctx.registries.map((url) => url.href)
        )
    }

    public async find(id: string, registryUrl?: URL): Promise<AssetBody> {
        const assets = await this.list()
        const asset = registryUrl
            ? assets.filter(
                  (asset) =>
                      asset.id === id && asset.registryUrl === registryUrl?.href
              )
            : assets.filter((asset) => asset.id === id)

        if (asset.length === 0) {
            this.ctx.error.throw({
                message: `Asset with id ${id} not found`,
                type: 'NotFound',
            })
        }

        if (asset.length > 1) {
            this.ctx.error.throw({
                message: `Multiple assets with id ${id}, please provide a registryUrl`,
                type: 'SDKOperationUnsupported',
            })
        }
        return asset[0]
    }
}
