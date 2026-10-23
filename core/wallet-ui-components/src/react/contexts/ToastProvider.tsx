// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { Stack } from '@mui/material'
import { Toast } from '../components/Toast'
import { ToastContext, type ToastOptions } from './ToastContext'

interface ActiveToast extends ToastOptions {
    id: number
}

interface ToastProviderProps {
    children: ReactNode
    /** How long a toast stays before dismissing itself, in ms @default 5000 */
    autoHideDuration?: number
}

/** Renders the toasts raised through `useToast()` and `useErrorToast()`. Mount it once, near the app root */
export const ToastProvider = ({
    children,
    autoHideDuration = 5000,
}: ToastProviderProps) => {
    const [toasts, setToasts] = useState<ActiveToast[]>([])
    const nextId = useRef(0)

    const showToast = useCallback((options: ToastOptions) => {
        setToasts((current) => [
            ...current,
            { ...options, id: nextId.current++ },
        ])
    }, [])

    const value = useMemo(() => ({ showToast }), [showToast])

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toasts.length > 0 && (
                <Stack
                    spacing={1}
                    sx={{
                        position: 'fixed',
                        right: { xs: 16, sm: 20 },
                        bottom: { xs: 16, sm: 20 },
                        zIndex: (theme) => theme.zIndex.snackbar,
                        width: { xs: 'calc(100vw - 32px)', sm: 380 },
                        maxWidth: 'calc(100vw - 32px)',
                        // Only the toasts take clicks, not the gaps between them
                        pointerEvents: 'none',
                    }}
                >
                    {toasts.map(({ id, ...options }) => (
                        <Toast
                            key={id}
                            {...options}
                            autoHideDuration={autoHideDuration}
                            onExited={() =>
                                setToasts((current) =>
                                    current.filter((toast) => toast.id !== id)
                                )
                            }
                        />
                    ))}
                </Stack>
            )}
        </ToastContext.Provider>
    )
}
