// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import { Alert, AlertTitle, Snackbar } from '@mui/material'

export type ToastMessageType = 'info' | 'success' | 'error'

interface ToastProps {
    title: string
    message: string
    /** @default 'error' */
    type?: ToastMessageType
    /** Accessible name of the dismiss button @default 'Dismiss notification' */
    buttonText?: string
    /** How long the toast stays before dismissing itself, in ms */
    autoHideDuration: number
    /** Called once the toast has been dismissed and finished its exit animation */
    onExited?: () => void
}

/**
 * A single toast. It is not positioned: it renders where it is placed, which
 * lets `ToastProvider` stack several of them. Use `useToast()` to raise toasts
 */
export const Toast = ({
    title,
    message,
    type = 'error',
    buttonText = 'Dismiss notification',
    autoHideDuration,
    onExited,
}: ToastProps) => {
    const [open, setOpen] = useState(true)

    return (
        <Snackbar
            open={open}
            autoHideDuration={autoHideDuration}
            onClose={(_event, reason) => {
                // Clicking elsewhere on the page shouldn't dismiss a toast
                if (reason === 'clickaway') return
                setOpen(false)
            }}
            slotProps={{ transition: { onExited: () => onExited?.() } }}
            sx={{ position: 'static', pointerEvents: 'auto' }}
        >
            <Alert
                // Errors interrupt the screen reader, the rest wait their turn
                role={type === 'error' ? 'alert' : 'status'}
                severity={type}
                closeText={buttonText}
                onClose={() => setOpen(false)}
                sx={{ width: '100%' }}
            >
                <AlertTitle>{title}</AlertTitle>
                {message}
            </Alert>
        </Snackbar>
    )
}
