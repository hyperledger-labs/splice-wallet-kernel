// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react'
import {
    getErrorToastContent,
    type ErrorToastFallback,
} from '../../internal/error-toast'
import { useToast } from './useToast'

export type { ErrorToastFallback }

/**
 * Returns a function that shows an error toast for any thrown value, the
 * replacement for `handleErrorToast`. JSON-RPC errors get a readable title
 */
export const useErrorToast = (): ((
    e: unknown,
    fallback?: ErrorToastFallback
) => void) => {
    const { showToast } = useToast()

    return useCallback(
        (e: unknown, fallback?: ErrorToastFallback) =>
            showToast({ ...getErrorToastContent(e, fallback), type: 'error' }),
        [showToast]
    )
}
