// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
    amuletPreapprovalQueryOptions,
    utilityOperatorQueryOptions,
    utilityPreapprovalsQueryOptions,
} from './query-options'
import { findPreapproval } from '@lib/utilities-wallet-sdk-plugin'
import type { WalletSdk } from './useWalletSdk'
import type { PreapprovalRow } from '../types/preapprovals'

type UsePreapprovalStatusesArgs = {
    rows: PreapprovalRow[]
    primaryParty: string | undefined
    sdk: WalletSdk
}

/** A row combines up to three queries, so it carries its own flags. */
export type PreapprovalStatus = {
    isEnabled: boolean
    isLoading: boolean
    isError: boolean
    refetch: () => void
}

/** Reads preapprovals once per party, then works out each row from that. */
export function usePreapprovalStatuses({
    rows,
    primaryParty,
    sdk,
}: UsePreapprovalStatusesArgs): PreapprovalStatus[] {
    // Amulet preapprovals of the party
    const amuletPreapproval = useQuery(
        amuletPreapprovalQueryOptions({ party: primaryParty, sdk })
    )
    // utility preapprovals of the party
    const utilityPreapprovals = useQuery(
        utilityPreapprovalsQueryOptions({ party: primaryParty, sdk })
    )

    // The registries behind the utility rows, without repeats.
    const registries = useMemo(
        () =>
            Array.from(
                new Map(
                    rows
                        .filter((row) => row.kind === 'utility')
                        .map((row) => [
                            row.registryPartyId,
                            {
                                registryPartyId: row.registryPartyId,
                                registryUrl: row.registryUrl,
                            },
                        ])
                ).values()
            ),
        [rows]
    )

    // The operator party of each registry.
    const operatorQueries = useQueries({
        queries: registries.map((registry) => ({
            ...utilityOperatorQueryOptions(registry),
            enabled: !!primaryParty && !!sdk,
        })),
    })

    return rows.map((row) => {
        if (row.kind === 'amulet') {
            return {
                isEnabled: Boolean(amuletPreapproval.data),
                isLoading: amuletPreapproval.isPending,
                isError: amuletPreapproval.isError,
                refetch: () => void amuletPreapproval.refetch(),
            }
        }

        const operatorQuery =
            operatorQueries[
                registries.findIndex(
                    (registry) =>
                        registry.registryPartyId === row.registryPartyId
                )
            ]

        // Either read could be the one that failed.
        const refetch = () => {
            void operatorQuery?.refetch()
            void utilityPreapprovals.refetch()
        }

        if (operatorQuery?.isError || utilityPreapprovals.isError) {
            return {
                isEnabled: false,
                isLoading: false,
                isError: true,
                refetch,
            }
        }

        const operator = operatorQuery?.data
        if (
            !primaryParty ||
            operator === undefined ||
            utilityPreapprovals.data === undefined
        ) {
            return {
                isEnabled: false,
                isLoading: true,
                isError: false,
                refetch,
            }
        }

        const preapproval = findPreapproval(utilityPreapprovals.data, {
            receiver: primaryParty,
            operator,
            instrumentAdmin: row.registryPartyId,
            instrumentId: row.instrument.id,
        })

        return {
            isEnabled: preapproval !== null,
            isLoading: false,
            isError: false,
            refetch,
        }
    })
}
