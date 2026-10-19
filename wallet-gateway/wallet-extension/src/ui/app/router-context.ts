// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { QueryClient } from '@tanstack/react-query'

/** The extension page the route tree is mounted in. */
export type UiEntry = 'popup' | 'app'

export interface RouterContext {
    queryClient: QueryClient
    entry: UiEntry
}
