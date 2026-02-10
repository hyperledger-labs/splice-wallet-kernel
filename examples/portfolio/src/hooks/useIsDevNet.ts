// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useConnection } from '../contexts/ConnectionContext'
import { useIsDevNetQueryOptions } from './query-options'

export const useIsDevNet = (): UseQueryResult<boolean> => {
    const sessionToken = useConnection().status?.session?.accessToken
    return useQuery(useIsDevNetQueryOptions(sessionToken))
}
