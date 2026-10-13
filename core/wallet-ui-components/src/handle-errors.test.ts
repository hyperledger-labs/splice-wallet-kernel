// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, expect, it } from 'vitest'
import { JsonRpcError } from '@canton-network/core-rpc-errors'
import './components/custom-toast.js'
import { handleErrorToast } from './handle-errors.js'

type ToastElement = HTMLElement & {
    title: string
    message: string
    type: string
    buttonText: string
}

const getToast = (): ToastElement => {
    const toast = document.body.querySelector('custom-toast')
    expect(toast).not.toBeNull()
    return toast as ToastElement
}

describe('handleErrorToast', () => {
    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('shows a generic toast for unknown errors', () => {
        handleErrorToast(new Error('boom'))

        const toast = getToast()
        expect(toast.title).toBe('Unexpected Error')
        expect(toast.message).toBe('boom')
        expect(toast.type).toBe('error')
        expect(toast.buttonText).toBe('Dismiss')
    })

    it('uses fallback text when the error has no message', () => {
        handleErrorToast({}, { title: 'Custom', message: 'Fallback body' })

        const toast = getToast()
        expect(toast.title).toBe('Custom')
        expect(toast.message).toBe('Fallback body')
        expect(toast.buttonText).toBe('Dismiss')
    })

    it('maps JSON-RPC error codes to titles', () => {
        const cases = [
            { code: -32600, title: 'Invalid Request' },
            { code: -32601, title: 'Method Not Found' },
            { code: -32602, title: 'Invalid Parameters' },
            { code: -32603, title: 'Internal Error' },
            { code: -32005, title: 'Limit Exceeded' },
        ] as const

        for (const { code, title } of cases) {
            document.body.innerHTML = ''
            handleErrorToast(new JsonRpcError(code, `msg-${code}`))

            const toast = getToast()
            expect(toast.title).toBe(title)
            expect(toast.message).toBe(`msg-${code}`)
        }
    })

    it('allows custom fallback button text', () => {
        handleErrorToast(new Error('x'), { buttonText: 'Close' })

        expect(getToast().buttonText).toBe('Close')
    })
})
