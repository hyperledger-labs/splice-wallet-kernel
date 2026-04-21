// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState, useCallback, useRef } from 'react'

export function usePolling<T>(
    fetcher: () => Promise<T>,
    intervalMs: number = 10000
): {
    data: T | null
    error: string | null
    loading: boolean
    refresh: () => void
} {
    const [data, setData] = useState<T | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const fetcherRef = useRef(fetcher)
    fetcherRef.current = fetcher

    const refresh = useCallback(async () => {
        try {
            const result = await fetcherRef.current()
            setData(result)
            setError(null)
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refresh()
        const id = setInterval(refresh, intervalMs)
        return () => clearInterval(id)
    }, [refresh, intervalMs])

    return { data, error, loading, refresh }
}
