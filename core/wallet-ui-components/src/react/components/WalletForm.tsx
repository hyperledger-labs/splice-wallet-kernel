// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode, SubmitEvent } from 'react'
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material'

interface WalletFormProps {
    /** The form's fields */
    children: ReactNode
    /** Called when the form is submitted, unless it is disabled or submitting */
    onSubmit: () => void | Promise<void>
    submitLabel: string
    /** Shown on the button while `submitting` */
    submittingLabel: string
    /** Announced below the button while `submitting` */
    submittingMessage: string
    /** Shows a spinner and the submitting texts, and disables the form @default false */
    submitting?: boolean
    /** Disables the submit button, e.g. while options are still loading @default false */
    loading?: boolean
    /** Disables the submit button, e.g. when the fields can't be submitted yet @default false */
    submitDisabled?: boolean
}

/**
 * The shell of the wallet forms: the fields, and a submit button that shows
 * progress. The create and edit forms put their own fields inside it
 */
export const WalletForm = ({
    children,
    onSubmit,
    submitLabel,
    submittingLabel,
    submittingMessage,
    submitting = false,
    loading = false,
    submitDisabled = false,
}: WalletFormProps) => {
    const disabled = submitting || loading || submitDisabled

    const handleSubmit = (e: SubmitEvent) => {
        e.preventDefault()
        if (disabled) return
        void onSubmit()
    }

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            <Stack spacing={2}>{children}</Stack>

            <Stack spacing={1} sx={{ mt: 'auto', pt: 3 }}>
                <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={disabled}
                    startIcon={
                        submitting ? (
                            <CircularProgress
                                size={16}
                                color="inherit"
                                aria-hidden="true"
                            />
                        ) : undefined
                    }
                >
                    {submitting ? submittingLabel : submitLabel}
                </Button>
                {submitting && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        role="status"
                        aria-live="polite"
                    >
                        {submittingMessage}
                    </Typography>
                )}
            </Stack>
        </Box>
    )
}
