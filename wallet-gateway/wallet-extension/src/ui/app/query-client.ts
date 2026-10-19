// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: { staleTime: 5_000, retry: 1 },
        },
    })
}
