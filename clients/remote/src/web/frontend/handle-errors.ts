// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { ErrorResponse } from '@canton-network/core-types'

export interface ToastElement extends HTMLElement {
    title: string
    message: string
    type: string
    buttonText: string
}

export function handleErrorToast(error: ErrorResponse) {
    const toast = document.createElement('custom-toast') as ToastElement

    const code = error.error.code
    const message = error.error.message
    const details = error.error.data ? String(error.error.data) : null

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
        default:
            toast.title = `RPC Error (${code})`
            break
    }

    toast.message = details ? `${message}\nDetails: ${details}` : message
    toast.type = 'error'
    toast.buttonText = 'Dismiss'
    document.body.appendChild(toast)
}
