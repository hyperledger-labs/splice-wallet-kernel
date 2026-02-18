// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { WalletSdkContext } from '../sdk'
import { findAssetById } from '../registries/types'

export class Amulet {
    constructor(private readonly sdkContext: WalletSdkContext) {}

    async tap(partyId: PartyId, amount: string, registryUrl?: URL) {
        const amulet = registryUrl
            ? findAssetById(this.sdkContext.assetList, 'Amulet', registryUrl)
            : this.fetchDefaultAmulet()

        if (!amulet) {
            throw new Error(
                `Amulet asset not found in asset list for registry URL: ${registryUrl?.href}`
            )
        }

        const [tapCommand, disclosedContracts] =
            await this.sdkContext.amuletService.createTap(
                partyId,
                amount,
                amulet.admin,
                amulet.id,
                amulet.registryUrl
            )
        return [{ ExerciseCommand: tapCommand }, disclosedContracts]
    }

    private fetchDefaultAmulet() {
        const defaultAmulet = this.sdkContext.assetList.filter(
            (asset) => asset.id === 'Amulet'
        )

        if (!defaultAmulet || defaultAmulet.length === 0) {
            throw new Error('Default Amulet asset not found in asset list')
        }

        if (defaultAmulet.length > 1) {
            throw new Error(
                'Multiple Amulets found in asset list, unable to determine default Amulet. Please specify the registry URL.'
            )
        }

        return defaultAmulet[0]
    }
}
