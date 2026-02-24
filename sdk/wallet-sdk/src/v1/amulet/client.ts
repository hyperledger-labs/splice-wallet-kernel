// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { WalletSdkContext } from '../sdk.js'
import { findAsset } from '../registries/types.js'
import { PreparedCommand } from '../transactions/types.js'

export class Amulet {
    constructor(private readonly sdkContext: WalletSdkContext) {}

    /**
     * Creates a new tap for the specified receiver and amount.
     * @param partyId The party of the receiver.
     * @param amount The amount to be tapped.
     * @param registryUrl Optional registry URL to specify which Amulet asset to use. If not provided, the default Amulet asset from the asset list will be used.
     * @returns A promise that resolves to the ExerciseCommand, which creates the tap, and the Disclosed Contracts.
     */
    async tap(
        partyId: PartyId,
        amount: string,
        registryUrl?: URL
    ): Promise<PreparedCommand> {
        const amulet = registryUrl
            ? findAsset(this.sdkContext.assetList, 'Amulet', registryUrl)
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

    /**
     * Tap is a non-token standard function that is specific to Amulet
     * This function fetches the default Amulet asset from the asset list based on the asset id 'Amulet'.
     * Multiple assets can be associated with multiple registries, if multiple Amulet assets are found, an error is thrown.
     * If no Amulet asset is found, an error is thrown.
     */
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
