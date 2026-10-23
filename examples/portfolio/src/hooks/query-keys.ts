// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const walletConnection = ['walletConnection'] as const

export const queryKeys = {
    walletConnection: {
        all: walletConnection,

        walletSdk: {
            all: [...walletConnection, 'walletSdk'] as const,
            forConfig: ({
                tokenVersion,
                registryUrls,
            }: {
                tokenVersion: number
                registryUrls: readonly string[]
            }) =>
                [
                    ...walletConnection,
                    'walletSdk',
                    tokenVersion,
                    registryUrls,
                ] as const,
        },

        holdings: {
            all: [...walletConnection, 'holdings'] as const,
            forParty: (party: string | undefined) =>
                [...walletConnection, 'holdings', party] as const,
        },

        pendingTransfers: {
            all: [...walletConnection, 'pendingTransfers'] as const,
            forParty: (party: string | undefined) =>
                [...walletConnection, 'pendingTransfers', party] as const,
        },

        allocations: {
            all: [...walletConnection, 'allocations'] as const,
            forParty: (party: string | undefined) =>
                [...walletConnection, 'allocations', party] as const,
        },

        allocationRequests: {
            all: [...walletConnection, 'allocationRequests'] as const,
            forParty: (party: string | undefined) =>
                [...walletConnection, 'allocationRequests', party] as const,
        },

        transactionHistory: {
            all: [...walletConnection, 'transactionHistory'] as const,
            forParty: (party: string | undefined) =>
                [...walletConnection, 'transactionHistory', party] as const,
        },

        transactionHistoryService: {
            all: [...walletConnection, 'transactionHistoryService'] as const,
            forParty: (party: string) =>
                [
                    ...walletConnection,
                    'transactionHistoryService',
                    party,
                ] as const,
        },

        // Both reads take a party and nothing else. Naming the instrument
        // here would run the same read once per row.
        preapprovals: {
            all: [...walletConnection, 'preapprovals'] as const,
            amulet: (party: string | undefined) =>
                [...walletConnection, 'preapprovals', 'amulet', party] as const,
            utility: (party: string | undefined) =>
                [
                    ...walletConnection,
                    'preapprovals',
                    'utility',
                    party,
                ] as const,
        },
    },

    isDevNet: {
        forValidator: (validatorUrl: string) =>
            ['isDevNet', validatorUrl] as const,
        all: ['isDevNet'] as const,
    },

    instruments: {
        all: ['instruments'] as const,
        forRegistry: (party: string, url: string) =>
            ['instruments', party, url] as const,
    },

    registries: {
        all: ['registries'] as const,
    },

    registryInfo: {
        all: ['registryInfo'] as const,
        forRegistry: (url: string) => ['registryInfo', url] as const,
    },

    utilityOperators: {
        all: ['utilityOperators'] as const,
        forRegistry: (registryPartyId: string, registryUrl: string) =>
            ['utilityOperators', registryPartyId, registryUrl] as const,
    },
}
