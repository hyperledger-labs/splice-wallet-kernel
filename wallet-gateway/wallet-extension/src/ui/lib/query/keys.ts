// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Query key factory. Every TanStack Query key in the UI comes from here, so
// `invalidateQueries({ queryKey: queryKeys.wallets.all })` reaches every
// wallets query. Follows examples/portfolio/src/hooks/query-keys.ts.
// Add a key when the first query that needs it lands.

export const queryKeys = {
    vault: {
        all: ['vault'] as const,
        status: () => ['vault', 'status'] as const,
    },

    sessions: {
        all: ['sessions'] as const,
    },

    networks: {
        all: ['networks'] as const,
    },

    idps: {
        all: ['idps'] as const,
    },

    wallets: {
        all: ['wallets'] as const,
        list: (networkId: string | undefined) =>
            ['wallets', 'list', networkId] as const,
    },
}
