// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Logger } from 'pino'
import type {
    LedgerTypes,
    TokenProviderConfig,
} from '@canton-network/wallet-sdk'
import { AuthTokenProvider } from '@canton-network/core-wallet-auth'

// ─────────────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────────────

/** A contract as returned by the scan proxy API (camelCase JS field names). */
export interface ScanProxyContract {
    contract_id: string
    template_id: string
    created_event_blob: string
    payload: Record<string, unknown>
}

/** Amulet instrument info fetched from the scan proxy. */
export interface AmuletInfo {
    /** Full AmuletRules contract from scan proxy. */
    amuletRulesContract: ScanProxyContract
    /** Contract ID of AmuletRules. */
    amuletRulesCid: string
    /** DSO party ID — admin of the Amulet instrument. */
    amuletAdmin: string
    /** The currently active OpenMiningRound contract. */
    activeRoundContract: ScanProxyContract
    /** Contract ID of the active OpenMiningRound. */
    openMiningRoundCid: string
}

/** Choice context returned by the scan proxy token-standard registry. */
export interface ScanProxyChoiceContext {
    disclosedContracts: LedgerTypes['DisclosedContract'][]
    choiceContextData?: Record<string, unknown>
}

/** Result of resolving the AllocationFactory for an Amulet instrument. */
export interface AllocationFactoryResult {
    factoryId: string
    choiceContext: ScanProxyChoiceContext
}

// ─────────────────────────────────────────────────────────────────────────────
// ScanProxyClient
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thin client for the scan proxy API calls needed by multi-sync examples.
 *
 * Covers three operations:
 *   1. {@link fetchAmuletInfo}           — AmuletRules + active OpenMiningRound
 *   2. {@link fetchAllocationFactory}    — resolve AllocationFactory for Amulet
 *   3. {@link fetchExecuteTransferContext} — execute-transfer context for settlement
 *
 * Use {@link createScanProxyClient} to construct an authenticated instance.
 */
export class ScanProxyClient {
    /** Base URL with guaranteed trailing slash for URL resolution. */
    private readonly baseHref: string
    private readonly headers: Record<string, string>

    constructor(baseUrl: URL, headers: Record<string, string>) {
        this.baseHref = baseUrl.href.endsWith('/')
            ? baseUrl.href
            : baseUrl.href + '/'
        this.headers = headers
    }

    /**
     * Fetches AmuletRules and the currently active OpenMiningRound from the
     * scan proxy (`/v0/scan-proxy/amulet-rules` and
     * `/v0/scan-proxy/open-and-issuing-mining-rounds`).
     *
     * Returns all fields needed to build Amulet tap / allocation commands.
     */
    async fetchAmuletInfo(): Promise<AmuletInfo> {
        const [amuletRulesResp, roundsResp] = await Promise.all([
            fetch(new URL('amulet-rules', this.baseHref), {
                headers: this.headers,
            }),
            fetch(new URL('open-and-issuing-mining-rounds', this.baseHref), {
                headers: this.headers,
            }),
        ])

        if (!amuletRulesResp.ok)
            throw new Error(
                `Failed to fetch AmuletRules: ${amuletRulesResp.status}`
            )
        if (!roundsResp.ok)
            throw new Error(
                `Failed to fetch mining rounds: ${roundsResp.status}`
            )

        const { amulet_rules: amuletRulesWithState } =
            (await amuletRulesResp.json()) as {
                amulet_rules: { contract: ScanProxyContract }
            }
        const { open_mining_rounds: openMiningRoundsWithState } =
            (await roundsResp.json()) as {
                open_mining_rounds: Array<{
                    contract: ScanProxyContract & {
                        payload: { opensAt?: string; targetClosesAt?: string }
                    }
                }>
            }

        const amuletRulesContract = amuletRulesWithState.contract
        const amuletRulesCid = amuletRulesContract.contract_id
        const amuletAdmin = amuletRulesContract.payload['dso'] as string

        if (!amuletAdmin)
            throw new Error('AmuletRules payload missing dso field')

        const nowMs = Date.now()
        const activeRoundContract = openMiningRoundsWithState
            .map((r) => r.contract)
            .find((c) => {
                const openMs = c.payload.opensAt
                    ? Number(new Date(c.payload.opensAt))
                    : NaN
                const closeMs = c.payload.targetClosesAt
                    ? Number(new Date(c.payload.targetClosesAt))
                    : NaN
                return openMs <= nowMs && nowMs < closeMs
            })

        if (!activeRoundContract)
            throw new Error('No active OpenMiningRound found at current time')

        return {
            amuletRulesContract,
            amuletRulesCid,
            amuletAdmin,
            activeRoundContract,
            openMiningRoundCid: activeRoundContract.contract_id,
        }
    }

    /**
     * Resolves the AllocationFactory contract for an Amulet allocation via the
     * scan proxy token-standard registry
     * (`/registry/allocation-instruction/v1/allocation-factory`).
     *
     * Returns the factory contract ID and the choice context (disclosed
     * contracts + context data) needed for `AllocationFactory_Allocate`.
     *
     * @param choiceArgs - The `AllocationFactory_Allocate` choice arguments to
     *   POST to the registry so it can determine the correct factory.
     */
    async fetchAllocationFactory(
        choiceArgs: unknown
    ): Promise<AllocationFactoryResult> {
        const resp = await fetch(
            new URL(
                'registry/allocation-instruction/v1/allocation-factory',
                this.baseHref
            ),
            {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({
                    choiceArguments: choiceArgs,
                    excludeDebugFields: true,
                }),
            }
        )
        if (!resp.ok)
            throw new Error(
                `Failed to fetch Amulet AllocationFactory: ${resp.status}`
            )
        return resp.json() as Promise<AllocationFactoryResult>
    }

    /**
     * Fetches the execute-transfer choice context for an Amulet allocation
     * from the scan proxy registry
     * (`/registry/allocations/v1/{allocationId}/choice-contexts/execute-transfer`).
     *
     * `Allocation_ExecuteTransfer` on Amulet requires a non-empty context
     * (e.g. `external-party-config-state`) that only the registry can provide,
     * together with the required disclosed contracts.
     *
     * @param allocationCid - Contract ID of the Amulet allocation.
     */
    async fetchExecuteTransferContext(
        allocationCid: string
    ): Promise<ScanProxyChoiceContext> {
        const resp = await fetch(
            new URL(
                `registry/allocations/v1/${allocationCid}/choice-contexts/execute-transfer`,
                this.baseHref
            ),
            {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ excludeDebugFields: true }),
            }
        )
        if (!resp.ok)
            throw new Error(
                `Failed to fetch Amulet execute-transfer context: ${resp.status}`
            )
        return resp.json() as Promise<ScanProxyChoiceContext>
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates an authenticated {@link ScanProxyClient}.
 *
 * Obtains an access token once using `authConfig` and reuses it for all
 * subsequent calls on the returned client instance.
 *
 * @param baseUrl    - Scan proxy base URL (e.g. `LOCALNET_REGISTRY_API_URL`).
 * @param authConfig - Token provider config (e.g. `TOKEN_PROVIDER_CONFIG_DEFAULT`).
 * @param logger     - Pino logger instance (passed to {@link AuthTokenProvider}).
 */
export async function createScanProxyClient(
    baseUrl: URL,
    authConfig: TokenProviderConfig,
    logger: Logger
): Promise<ScanProxyClient> {
    const token = await new AuthTokenProvider(
        authConfig,
        logger
    ).getAccessToken()
    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    }
    return new ScanProxyClient(baseUrl, headers)
}
