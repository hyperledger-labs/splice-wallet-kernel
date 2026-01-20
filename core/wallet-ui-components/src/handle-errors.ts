// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { ErrorResponse } from '@canton-network/core-types'

type ToastElement = HTMLElement & {
    title: string
    message: string
    type: string
    buttonText: string
}

type FallbackType = {
    message?: string
    buttonText?: string
    title?: string
}

export function handleErrorToast(e: unknown, fallback?: FallbackType) {
    const toast = document.createElement('custom-toast') as ToastElement
    let code: number = -1
    let message = ''

    if (e instanceof Error) {
        message = e.message
    }

    // TODO: if an API call fails in the frontend, it loses the structured error info and falls back to Unexpected.
    // See line 242 in core/types/src/index.ts (class HttpTransport)
    if (ErrorResponse.safeParse(e).success) {
        const parsed: ErrorResponse = ErrorResponse.parse(e)
        code = parsed.error.code
        message = parsed.error.message
    }

    switch (code) {
        case -32600:
            toast.title = 'Invalid Request'
            break
        case -32601:
            toast.title = 'Method Not Found'
            break
        case -32602:
            toast.title = 'Invalid Parameters'
            break
        case -32603:
            toast.title = 'Internal Error'
            break
        case 413:
            toast.title = 'Payload Too Large'
            break
        default:
            toast.title = fallback?.title || 'Unexpected Error'
            break
    }

    toast.message =
        message ||
        fallback?.message ||
        'Something went wrong. Please try again.'
    toast.type = 'error'
    toast.buttonText = fallback?.buttonText || 'Dismiss'
    document.body.appendChild(toast)
}
