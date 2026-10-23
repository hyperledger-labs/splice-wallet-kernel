// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { queryOptions } from '@tanstack/react-query'
import * as dappSdk from '@canton-network/dapp-sdk'
import type { LedgerProvider } from '@canton-network/core-provider-ledger'
import { usePortfolioConfig } from '../contexts/PortfolioConfigContext'
import { queryKeys } from './query-keys'
import { useWalletSdk, type WalletSdk } from './useWalletSdk'
import { logger } from '@lib/logger'
import { TransactionHistoryService } from '@services/transaction-history-service'
import { toOwnedHoldings, toUniquePortfolioHoldings } from '@utils/holdings'

const UTILITY_OPERATOR_ENDPOINT = '/api/utilities/v0/operator'

type UtilityOperatorResponse = {
    partyId?: string
}

export const utilityOperatorQueryOptions = ({
    registryPartyId,
    registryUrl,
}: {
    registryPartyId: string
    registryUrl: string
}) =>
    queryOptions({
        queryKey: queryKeys.utilityOperators.forRegistry(
            registryPartyId,
            registryUrl
        ),
        queryFn: async () => {
            const response = await fetch(
                new URL(
                    `${new URL(registryUrl).origin}${UTILITY_OPERATOR_ENDPOINT}`
                )
            )

            if (!response.ok) {
                throw new Error('Unable to read utility operator party')
            }

            const { partyId } =
                (await response.json()) as UtilityOperatorResponse
            if (!partyId) {
                throw new Error('Utility operator response is missing partyId')
            }

            return partyId
        },
        // The operator party for a registry is fixed, so cache it forever and
        // let consumers re-fetch on demand when a lookup previously failed.
        // Rows subscribe to it now, so it must skip the polling interval too.
        staleTime: Infinity,
        refetchInterval: false as const,
    })

export const transactionHistoryServiceQueryOptions = (partyId: string) =>
    queryOptions({
        queryKey:
            queryKeys.walletConnection.transactionHistoryService.forParty(
                partyId
            ),
        queryFn: () => {
            const provider = dappSdk.getConnectedProvider()
            if (!provider) {
                throw new Error('Dapp provider is not available')
            }

            return new TransactionHistoryService({
                logger,
                provider: provider as unknown as LedgerProvider,
                party: partyId,
            })
        },
        staleTime: Infinity,
        gcTime: Infinity,
    })

export const holdingsQueryOptions = ({
    partyId,
    sdk,
}: {
    partyId: string | undefined
    sdk: WalletSdk
}) =>
    queryOptions({
        queryKey: queryKeys.walletConnection.holdings.forParty(partyId),
        enabled: !!partyId && !!sdk,
        queryFn: async () => {
            if (!partyId || !sdk) {
                throw new Error('Wallet SDK and party are required')
            }

            const contracts = await sdk.token.utxos.list({
                partyId,
                includeLocked: true,
            })

            return toOwnedHoldings(
                toUniquePortfolioHoldings(contracts),
                partyId
            )
        },
    })

export const usePendingTransfersQueryOptions = (party: string | undefined) => {
    const { sdk } = useWalletSdk()

    return queryOptions({
        queryKey: queryKeys.walletConnection.pendingTransfers.forParty(party),
        enabled: !!party && !!sdk,
        queryFn: async () => {
            if (!party || !sdk) {
                throw new Error('Wallet SDK and party are required')
            }

            return await sdk.token.transfer.pending(party)
        },
    })
}

export const useAllocationRequestsQueryOptions = (
    party: string | undefined
) => {
    const { sdk } = useWalletSdk()

    return queryOptions({
        queryKey: queryKeys.walletConnection.allocationRequests.forParty(party),
        enabled: !!party && !!sdk,
        queryFn: async () => {
            if (!party || !sdk) {
                throw new Error('Wallet SDK and party are required')
            }
            return await sdk.token.allocation.request.pending(party)
        },
    })
}

export const useAllocationsQueryOptions = (party: string | undefined) => {
    const { sdk } = useWalletSdk()

    return queryOptions({
        queryKey: queryKeys.walletConnection.allocations.forParty(party),
        enabled: !!party && !!sdk,
        queryFn: async () => {
            if (!party || !sdk) {
                throw new Error('Wallet SDK and party are required')
            }
            return await sdk.token.allocation.pending(party)
        },
    })
}

export const useIsDevNetQueryOptions = () => {
    const { sdk } = useWalletSdk()
    const {
        amulet: { validatorUrl },
    } = usePortfolioConfig()
    return queryOptions({
        queryKey: queryKeys.isDevNet.forValidator(validatorUrl),
        queryFn: async () => {
            if (!sdk) {
                throw new Error('Wallet SDK is not available')
            }

            const url = new URL(validatorUrl)
            if (url.protocol === 'http:') {
                logger.warn(
                    { validatorUrl: url.toString() },
                    'Using a non-TLS validator endpoint. This is acceptable only in trusted environments. Set validatorUrl in portfolio config to an HTTPS endpoint if the validator API is reachable over an untrusted network.'
                )
            }

            return await sdk.amulet.isDevNet()
        },
        enabled: !!sdk,
        staleTime: Infinity, // Network doesn't change, so cache forever
    })
}

// Match the SDK's 10-second preapproval visibility polling interval.
const PREAPPROVAL_STALE_TIME = 10_000

/** The party's Amulet preapproval. Every Amulet row shares this query. */
export const amuletPreapprovalQueryOptions = ({
    party,
    sdk,
}: {
    party: string | undefined
    sdk: WalletSdk
}) =>
    queryOptions({
        queryKey: queryKeys.walletConnection.preapprovals.amulet(party),
        enabled: !!party && !!sdk,
        staleTime: PREAPPROVAL_STALE_TIME,
        queryFn: async () => {
            if (!party || !sdk) {
                return null
            }

            return (await sdk.amulet.preapproval.fetchQuick(party)) ?? null
        },
    })

/** All the party's utility preapprovals, in one scan for the whole table. */
export const utilityPreapprovalsQueryOptions = ({
    party,
    sdk,
}: {
    party: string | undefined
    sdk: WalletSdk
}) =>
    queryOptions({
        queryKey: queryKeys.walletConnection.preapprovals.utility(party),
        enabled: !!party && !!sdk,
        staleTime: PREAPPROVAL_STALE_TIME,
        queryFn: async () => {
            if (!party || !sdk) {
                return []
            }

            return await sdk.utilities.preapprovalTransfer.list(party)
        },
    })
