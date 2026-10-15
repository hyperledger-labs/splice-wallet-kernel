// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PartyId } from '@canton-network/core-types'
import type { SDKContext } from '../../init/types/context.js'
import type { PreparedCommand } from '../transactions/types.js'
import type {
    FeaturedAppRight,
    GrantFeaturedAppRightsOptions,
    LookupFeaturedAppRightsOptions,
    RevokeFeaturedAppRightsOptions,
} from './types.js'
import type { AmuletService } from '@canton-network/core-amulet-service'
import { requireSynchronizerId } from '../../init/synchronizer.js'
import type {
    AssetBody,
    TokenStandardService,
} from '@canton-network/core-token-standard-service'
import { TrafficNamespace } from './traffic.js'
import { LedgerNamespace } from '../ledger/namespace.js'
import { PreapprovalNamespace } from './preapproval.js'
import { Decimal } from 'decimal.js'
import { parseAssets, ParsedURL } from '../utils/url.js'
import { resolveProviderParty } from './utils.js'

const defaultMaxRetries = 10
const defaultDelayMs = 5000
/** Scan can lag well beyond ledger completion; match preapproval cancel polling. */
const defaultRevokeMaxRetries = 30
const defaultRevokeDelayMs = 10_000

export type AmuletNamespaceConfig = {
    commonCtx: SDKContext
    registry: ParsedURL | AssetBody
    amuletService: AmuletService
    tokenStandardService: TokenStandardService
    validatorParty?: PartyId
}

export class AmuletNamespace {
    public readonly traffic: TrafficNamespace
    public readonly preapproval: PreapprovalNamespace
    private readonly ledger: LedgerNamespace
    constructor(private readonly sdkContext: AmuletNamespaceConfig) {
        this.preapproval = new PreapprovalNamespace(sdkContext)
        this.traffic = new TrafficNamespace(sdkContext)
        this.ledger = new LedgerNamespace(sdkContext.commonCtx)
    }

    private async amulet(): Promise<AssetBody> {
        if (this.sdkContext.registry instanceof ParsedURL) {
            return parseAssets(
                this.sdkContext.commonCtx,
                await this.sdkContext.tokenStandardService.registriesToAssets([
                    this.sdkContext.registry,
                ])
            )[0]
        } else {
            return this.sdkContext.registry
        }
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
                new Decimal(amount).toFixed(10),
                amulet.admin,
                amulet.id,
                amulet.registryUrl
            )

        this.sdkContext.commonCtx.logger.info(tapCommand)
        return [{ ExerciseCommand: tapCommand }, disclosedContracts]
    }

    /**
     * Returns whether the configured Amulet network is a development network.
     */
    async isDevNet(): Promise<boolean> {
        return await this.sdkContext.amuletService.isDevNet()
    }

    /**
     * Creates and submits a tap command for a specified amount for an internal party
     * This is useful for tests and can only be used locally or against devnet
     * @param amount The amount to be tapped.
     * @param options Optional settings.
     * @param options.synchronizerId defaults to the first connected synchronizer
     * @param options.partyId optional internal party to receive tap, defaults to validator operator party
     * @returns the updateId and completionOffset for the submitted tap command
     */

    async tapInternal(
        amount: string,
        options?: { partyId?: PartyId; synchronizerId?: string }
    ) {
        const partyId = resolveProviderParty(
            this.sdkContext,
            'tapInternal',
            options?.partyId
        )
        const synchronizerId = await requireSynchronizerId(
            this.sdkContext.commonCtx,
            options?.synchronizerId
        )
        const [tapCommand, disclosedContracts] = await this.tap(partyId, amount)

        return await this.ledger.internal.submit({
            commands: [tapCommand],
            disclosedContracts,
            synchronizerId,
            actAs: [partyId],
        })
    }

    featuredApp: FeaturedAppNamespace = {
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
        revoke: async (
            options: RevokeFeaturedAppRightsOptions = {}
        ): Promise<boolean> => {
            return this.revokeFeatureAppRightsForValidator(options)
        },
    }

    private async grantFeatureAppRightsForValidator(
        options: GrantFeaturedAppRightsOptions
    ): Promise<FeaturedAppRight | undefined> {
        const providerParty = resolveProviderParty(
            this.sdkContext,
            'grantFeatureAppRightsForValidator',
            options.validatorParty
        )
        const featuredAppRights = await this.lookUpFeaturedAppRights({
            partyId: providerParty,
            maxRetries: 20,
            delayMs: 1000,
        })

        if (featuredAppRights) {
            return featuredAppRights
        }
        const synchronizerId = await requireSynchronizerId(
            this.sdkContext.commonCtx,
            options.synchronizerId
        )

        const [featuredAppCommand, dc] =
            await this.sdkContext.amuletService.selfGrantFeatureAppRight(
                providerParty,
                synchronizerId
            )

        await this.ledger.internal.submit({
            commands: [{ ExerciseCommand: featuredAppCommand }],
            disclosedContracts: dc,
            synchronizerId,
            actAs: [providerParty],
        })

        return this.lookUpFeaturedAppRights({
            partyId: providerParty,
            maxRetries: options.maxRetries ?? defaultMaxRetries,
            delayMs: options.delayMs ?? defaultDelayMs,
        })
    }

    private async revokeFeatureAppRightsForValidator(
        options: RevokeFeaturedAppRightsOptions
    ): Promise<boolean> {
        const providerParty = resolveProviderParty(
            this.sdkContext,
            'revokeFeatureAppRightsForValidator',
            options.validatorParty
        )
        const featuredAppRights = await this.lookUpFeaturedAppRights({
            partyId: providerParty,
            maxRetries: 1,
            delayMs: 0,
        })

        if (!featuredAppRights) {
            return true
        }

        const synchronizerId = await requireSynchronizerId(
            this.sdkContext.commonCtx,
            options.synchronizerId
        )

        const [cancelCommand, dc] =
            await this.sdkContext.amuletService.cancelFeaturedAppRight(
                featuredAppRights.contract_id,
                featuredAppRights.template_id
            )

        await this.ledger.internal.submit({
            commands: [{ ExerciseCommand: cancelCommand }],
            disclosedContracts: dc,
            synchronizerId,
            actAs: [providerParty],
        })

        return this.waitUntilNoFeaturedAppRights({
            partyId: providerParty,
            contractId: featuredAppRights.contract_id,
            maxRetries: options.maxRetries ?? defaultRevokeMaxRetries,
            delayMs: options.delayMs ?? defaultRevokeDelayMs,
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

    private async waitUntilNoFeaturedAppRights(options: {
        partyId: string
        contractId: string
        maxRetries?: number
        delayMs?: number
    }): Promise<boolean> {
        const { partyId, contractId } = options
        const maxRetries = options.maxRetries ?? defaultRevokeMaxRetries
        const delayMs = options.delayMs ?? defaultRevokeDelayMs

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const result =
                await this.sdkContext.amuletService.getFeaturedAppsByParty(
                    partyId
                )

            const stillPresent =
                result &&
                typeof result === 'object' &&
                Object.keys(result).length > 0 &&
                result.contract_id === contractId

            if (!stillPresent) {
                return true
            }

            this.sdkContext.commonCtx.logger.info(
                `featured app rights still present after revoke attempt ${attempt}. retrying again...`
            )

            if (attempt < maxRetries) {
                await new Promise((res) => setTimeout(res, delayMs))
            }
        }

        return false
    }
}

interface FeaturedAppNamespace {
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
    /**
     * Submits a command to revoke featured app rights for validator operator.
     * Polls Scan until the revoked contract is no longer visible (Scan can lag
     * behind ledger completion; default wait is up to ~5 minutes).
     * @returns `true` if no featured app rights remain after revoke.
     */
    revoke: (options?: RevokeFeaturedAppRightsOptions) => Promise<boolean>
}

export async function fetchAmulet(
    amuletCtx: AmuletNamespaceConfig
): Promise<AssetBody> {
    return amuletCtx.registry instanceof ParsedURL
        ? parseAssets(
              amuletCtx.commonCtx,
              await amuletCtx.tokenStandardService.registriesToAssets([
                  amuletCtx.registry,
              ])
          )[0]
        : amuletCtx.registry
}
