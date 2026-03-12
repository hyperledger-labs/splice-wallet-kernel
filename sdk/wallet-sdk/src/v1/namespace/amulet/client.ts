// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { WalletSdkContext } from '../../sdk.js'
import { PreparedCommand } from '../transactions/types.js'
import { Preapproval } from './preapproval.js'
import {
    FeaturedAppRight,
    GrantFeaturedAppRightsOptions,
    LookupFeaturedAppRightsOptions,
} from './types.js'
import { v4 } from 'uuid'

const defaultMaxRetries = 10
const defaultDelayMs = 5000

export class Amulet {
    public preapproval: Preapproval
    constructor(private readonly sdkContext: WalletSdkContext) {
        this.preapproval = new Preapproval(
            sdkContext,
            this.fetchDefaultAmulet()
        )
    }

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

    featuredApp: FeaturedAppService = {
        rights: async (
            options: LookupFeaturedAppRightsOptions
        ): Promise<FeaturedAppRight | undefined> => {
            return this.lookUpFeaturedAppRights(options)
        },
        grant: async (
            options: GrantFeaturedAppRightsOptions = {}
        ): Promise<FeaturedAppRight | undefined> => {
            return this.grantFeatureAppRightsForValidator(options)
        },
    }

    private async grantFeatureAppRightsForValidator(
        options: GrantFeaturedAppRightsOptions
    ): Promise<FeaturedAppRight | undefined> {
        const validatorOperatorParty =
            await this.sdkContext.validator.get('/v0/validator-user')

        const featuredAppRights = await this.lookUpFeaturedAppRights({
            partyId: validatorOperatorParty.party_id,
            maxRetries: 1,
            delayMs: 1000,
        })

        if (featuredAppRights) {
            return featuredAppRights
        }
        const synchronizerId =
            options.synchronizerId ||
            (await this.sdkContext.scanProxyClient.getAmuletSynchronizerId())

        if (!synchronizerId) {
            throw new Error(
                'Unable to fetch synchronizer ID for granting featured app right'
            )
        }

        const [featuredAppCommand, dc] =
            await this.sdkContext.amuletService.selfGrantFeatureAppRight(
                validatorOperatorParty.party_id,
                synchronizerId
            )

        const request = {
            commands: [{ ExerciseCommand: featuredAppCommand }],
            commandId: v4(),
            userId: this.sdkContext.userId,
            actAs: [validatorOperatorParty.party_id],
            readAs: [],
            disclosedContracts: dc || [],
            synchronizerId: synchronizerId,
            verboseHashing: false,
            packageIdSelectionPreference: [],
        }

        await this.sdkContext.ledgerProvider.request({
            method: 'ledgerApi',
            params: {
                resource: '/v2/commands/submit-and-wait',
                requestMethod: 'post',
                body: request,
            },
        })

        return this.lookUpFeaturedAppRights({
            partyId: validatorOperatorParty.party_id,
            maxRetries: options.maxRetries ?? defaultMaxRetries,
            delayMs: options.delayMs ?? defaultDelayMs,
        })
    }

    private async lookUpFeaturedAppRights(
        options: LookupFeaturedAppRightsOptions
    ): Promise<FeaturedAppRight | undefined> {
        const { partyId } = options
        const maxRetries = options.maxRetries ?? defaultMaxRetries
        const delayMs = options.delayMs ?? defaultDelayMs

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const result =
                await this.sdkContext.amuletService.getFeaturedAppsByParty(
                    partyId
                )

            if (
                result &&
                typeof result === 'object' &&
                Object.keys(result).length > 0
            ) {
                return result
            }
            this.sdkContext.logger.info(
                `lookup featured apps attempt ${attempt} returned undefined. retrying again...`
            )

            if (attempt < maxRetries) {
                await new Promise((res) => setTimeout(res, delayMs))
            }
        }

        return undefined
    }

    /**
     * Tap is a non-token standard function that is specific to Amulet
     * This function fetches the default Amulet asset from the asset list based on the asset id 'Amulet'.
     * Multiple assets can be associated with multiple registries, if multiple Amulet assets are found, an error is thrown.
     * If no Amulet asset is found, an error is thrown.
     */
    private fetchDefaultAmulet() {
        const defaultAmulet = this.sdkContext.asset.list.filter(
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
                message: 'Multiple assets found, please provide a registryUrl',
                type: 'Forbidden',
            })
        }

        return defaultAmulet[0]
    }
}

interface FeaturedAppService {
    /**
     * Looks up if a party has FeaturedAppRight.
     * Has an in built retry and delay between attempts
     * @returns If defined, a contract of Daml template `Splice.Amulet.FeaturedAppRight`.
     */
    rights: (
        options: LookupFeaturedAppRightsOptions
    ) => Promise<FeaturedAppRight | undefined>
    /**
     * Submits a command to grant feature app rights for validator operator.
     * @returns A contract of Daml template `Splice.Amulet.FeaturedAppRight`.
     */
    grant: (
        options?: GrantFeaturedAppRightsOptions
    ) => Promise<FeaturedAppRight | undefined>
}
