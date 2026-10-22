// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type {
    TokenStandardService,
    AssetBody,
} from '@canton-network/core-token-standard-service'
import type { SDKErrorHandler } from '../../error/index.js'
import { ParsedURL, type URLInput } from '../utils/url.js'
import type { SDKContext } from '../../sdk.js'

export type AssetContext = {
    tokenStandardService: TokenStandardService
    registries: URL[]
    error: SDKErrorHandler
    list: AssetBody[]
    commonCtx: SDKContext
}

export class AssetNamespace {
    constructor(private readonly ctx: AssetContext) {}

    public get list() {
        return this.ctx.list
    }

    public async find(id: string, registryUrl?: URLInput): Promise<AssetBody> {
        return findAsset(
            this.list,
            id,
            this.ctx.error,
            registryUrl
                ? new ParsedURL(this.ctx.commonCtx, registryUrl)
                : undefined
        )
    }
}

export function findAsset(
    assets: AssetBody[],
    id: string,
    error: SDKErrorHandler,
    registryUrl?: ParsedURL
): AssetBody {
    const asset = registryUrl
        ? assets.filter(
              (asset) =>
                  asset.id === id &&
                  asset.registryUrl.toString() === registryUrl.toString()
          )
        : assets.filter((asset) => asset.id === id)

    if (asset.length === 0) {
        error.throw({
            message: `Asset with id ${id} not found`,
            type: 'NotFound',
        })
    }

    if (asset.length > 1) {
        error.throw({
            message: 'Multiple assets found, please provide a registryUrl',
            type: 'Forbidden',
        })
    }
    return asset[0]
}
