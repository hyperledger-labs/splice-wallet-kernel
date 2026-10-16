// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { type ErrorComponentProps, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ButtonLink } from './ButtonLink'

export function PageLoader() {
    return (
        <Box
            role="status"
            aria-label="Loading"
            sx={{ display: 'flex', justifyContent: 'center', p: 4 }}
        >
            <CircularProgress />
        </Box>
    )
}

export function RouteError({ error }: ErrorComponentProps) {
    const router = useRouter()
    const queryErrorResetBoundary = useQueryErrorResetBoundary()

    // Let failed queries refetch when the route renders again.
    useEffect(() => {
        queryErrorResetBoundary.reset()
    }, [queryErrorResetBoundary])

    return (
        <Box sx={{ p: 2 }}>
            <Alert
                severity="error"
                action={
                    <Button
                        color="inherit"
                        size="small"
                        onClick={() => void router.invalidate()}
                    >
                        Retry
                    </Button>
                }
            >
                {(error instanceof Error && error.message) ||
                    'Something went wrong.'}
            </Alert>
        </Box>
    )
}

export function NotFound() {
    return (
        <Stack spacing={2} sx={{ p: 2, alignItems: 'flex-start' }}>
            <Alert severity="warning">This page doesn't exist.</Alert>
            <ButtonLink to="/" variant="outlined">
                Go home
            </ButtonLink>
        </Stack>
    )
}
