// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { PartyId } from '@canton-network/core-types'
import { SDKErrorHandler } from '../../error/index.js'
import { toURL } from '../../sdk.js'

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
    list: AssetBody[]
}

export class Asset {
    constructor(private readonly ctx: AssetContext) {}

    public get list() {
        return this.ctx.list
    }

    public async find(
        id: string,
        registryUrl?: URL | string
    ): Promise<AssetBody> {
        const asset = registryUrl
            ? this.list.filter(
                  (asset) =>
                      asset.id === id &&
                      asset.registryUrl ===
                          toURL(registryUrl, this.ctx.error).href
              )
            : this.list.filter((asset) => asset.id === id)

        if (asset.length === 0) {
            this.ctx.error.throw({
                message: `Asset with id ${id} not found`,
                type: 'NotFound',
            })
        }

        if (asset.length > 1) {
            this.ctx.error.throw({
                message: 'Multiple assets found, please provide a registryUrl',
                type: 'BadRequest',
            })
        }
        return asset[0]
    }
}
