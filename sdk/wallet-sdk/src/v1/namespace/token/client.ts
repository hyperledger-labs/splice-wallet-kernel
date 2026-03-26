// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { AssetBody, CommonCtx } from '../../sdk.js'
import { AllocationService } from './allocation/index.js'
import { UtxoService } from './utxos/index.js'
import { TransferService } from './transfer/index.js'
import { TokenStandardService } from '@canton-network/core-token-standard-service'
import { PartyId } from '@canton-network/core-types'
import { SDKErrorHandler } from '../../error/handler.js'

export type TokenNamespaceConfig = {
    tokenStandardService: TokenStandardService
    registryUrls: URL[]
    validatorParty: PartyId
    commonCtx: CommonCtx
}

export class Token {
    public readonly allocation: AllocationService
    public readonly transfer: TransferService
    public readonly utxos: UtxoService
    constructor(private readonly tokenContext: TokenNamespaceConfig) {
        this.allocation = new AllocationService(tokenContext)
        this.transfer = new TransferService(tokenContext)
        this.utxos = new UtxoService(tokenContext, this.transfer)
    }
}

export function findAsset(
    assets: AssetBody[],
    id: string,
    error: SDKErrorHandler,
    registryUrl?: URL
): AssetBody {
    const asset = registryUrl
        ? assets.filter(
              (asset) =>
                  asset.id === id && asset.registryUrl === registryUrl?.href
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
