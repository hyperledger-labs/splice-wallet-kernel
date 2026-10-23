// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useContext } from 'react'
import { ToastContext, type ToastContextValue } from '../contexts/ToastContext'

/** Shows a toast. Must be used inside a `ToastProvider` */
export const useToast = (): ToastContextValue => {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
