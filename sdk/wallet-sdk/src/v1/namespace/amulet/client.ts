// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { PartyId } from '@canton-network/core-types'
import { AssetBody, CommonCtx } from '../../sdk.js'
import { PreparedCommand } from '../transactions/types.js'
import { Preapproval } from './preapproval.js'
import {
    FeaturedAppRight,
    GrantFeaturedAppRightsOptions,
    LookupFeaturedAppRightsOptions,
} from './types.js'
import { Traffic } from './traffic.js'
import { Ledger } from '../ledger/client.js'
import { AmuletService } from '@canton-network/core-amulet-service'
import { TokenStandardService } from '@canton-network/core-token-standard-service'

const defaultMaxRetries = 10
const defaultDelayMs = 5000

export type AmuletNamespaceConfig = {
    commonCtx: CommonCtx
    registry: URL | AssetBody
    amuletService: AmuletService
    tokenStandardService: TokenStandardService
    validatorParty: PartyId
}

export class Amulet {
    public readonly traffic: Traffic
    public readonly preapproval: Preapproval
    private readonly ledger: Ledger
    constructor(private readonly sdkContext: AmuletNamespaceConfig) {
        this.preapproval = new Preapproval(sdkContext)
        this.traffic = new Traffic(sdkContext)
        this.ledger = new Ledger(sdkContext.commonCtx)
    }

    private async amulet(): Promise<AssetBody> {
        return this.sdkContext.registry instanceof URL
            ? (
                  await this.sdkContext.tokenStandardService.registriesToAssets(
                      [this.sdkContext.registry.href]
                  )
              )[0]
            : this.sdkContext.registry
    }

    /**
     * Creates a new tap for the specified receiver and amount.
     * @param partyId The party of the receiver.
     * @param amount The amount to be tapped.
     * @returns A promise that resolves to the ExerciseCommand, which creates the tap, and the Disclosed Contracts.
     */
    async tap(partyId: PartyId, amount: string): Promise<PreparedCommand> {
        const amulet = await this.amulet()

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
        const featuredAppRights = await this.lookUpFeaturedAppRights({
            partyId: this.sdkContext.validatorParty,
            maxRetries: 20,
            delayMs: 1000,
        })

        if (featuredAppRights) {
            return featuredAppRights
        }
        const synchronizerId =
            options.synchronizerId ??
            this.sdkContext.commonCtx.defaultSynchronizerId

        const [featuredAppCommand, dc] =
            await this.sdkContext.amuletService.selfGrantFeatureAppRight(
                this.sdkContext.validatorParty,
                synchronizerId
            )

        await this.ledger.internal.submit({
            commands: [{ ExerciseCommand: featuredAppCommand }],
            disclosedContracts: dc,
            synchronizerId,
            actAs: [this.sdkContext.validatorParty],
        })

        return this.lookUpFeaturedAppRights({
            partyId: this.sdkContext.validatorParty,
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
            this.sdkContext.commonCtx.logger.info(
                `lookup featured apps attempt ${attempt} returned undefined. retrying again...`
            )

            if (attempt < maxRetries) {
                await new Promise((res) => setTimeout(res, delayMs))
            }
        }

        return undefined
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

export async function fetchAmulet(
    amuletCtx: AmuletNamespaceConfig
): Promise<AssetBody> {
    return amuletCtx.registry instanceof URL
        ? (
              await amuletCtx.tokenStandardService.registriesToAssets([
                  amuletCtx.registry.href,
              ])
          )[0]
        : amuletCtx.registry
}
