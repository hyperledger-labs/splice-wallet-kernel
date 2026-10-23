// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    getErrorToastContent,
    type ErrorToastFallback,
} from './internal/error-toast.js'

type ToastElement = HTMLElement & {
    title: string
    message: string
    type: string
    buttonText: string
}

export function handleErrorToast(e: unknown, fallback?: ErrorToastFallback) {
    const toast = document.createElement('custom-toast') as ToastElement
    const content = getErrorToastContent(e, fallback)

    toast.title = content.title
    toast.message = content.message
    toast.type = 'error'
    toast.buttonText = content.buttonText
    document.body.appendChild(toast)
}
