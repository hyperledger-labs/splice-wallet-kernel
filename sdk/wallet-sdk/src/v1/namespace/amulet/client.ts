// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { WalletSdkContext } from '../../sdk'

export class Amulet {
    constructor(private readonly sdkContext: WalletSdkContext) {}

    /**
     * Creates a new tap for the specified receiver and amount.
     * @param partyId The party of the receiver.
     * @param amount The amount to be tapped.
     * @param registryUrl Optional registry URL to specify which Amulet asset to use. If not provided, the default Amulet asset from the asset list will be used.
     * @returns A promise that resolves to the ExerciseCommand and Disclosed Contracts.
     */
    async tap(partyId: PartyId, amount: string, registryUrl?: URL) {
        const amulet = registryUrl
            ? await this.sdkContext.asset.find('Amulet', registryUrl)
            : await this.fetchDefaultAmulet()

        if (!amulet) {
            this.sdkContext.error.throw({
                message: `Amulet asset not found in asset list for registry URL: ${registryUrl?.href}`,
                type: 'NotFound',
            })
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
    private async fetchDefaultAmulet() {
        const defaultAmulet = (await this.sdkContext.asset.list()).filter(
            (asset) => asset.id === 'Amulet'
        )

        if (!defaultAmulet || defaultAmulet.length === 0) {
            this.sdkContext.error.throw({
                message: 'Default Amulet asset not found in asset list',
                type: 'NotFound',
            })
        }

        if (defaultAmulet.length > 1) {
            this.sdkContext.error.throw({
                message:
                    'Multiple Amulets found in asset list, unable to determine default Amulet. Please specify the registry URL.',
                type: 'CantonError',
            })
        }

        return defaultAmulet[0]
    }
}
