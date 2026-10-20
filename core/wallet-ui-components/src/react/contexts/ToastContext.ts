// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createContext } from 'react'
import type { ToastMessageType } from '../components/Toast'

export interface ToastOptions {
    title: string
    message: string
    /** @default 'error' */
    type?: ToastMessageType
    /** Accessible name of the dismiss button @default 'Dismiss notification' */
    buttonText?: string
}

export interface ToastContextValue {
    showToast: (options: ToastOptions) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)
