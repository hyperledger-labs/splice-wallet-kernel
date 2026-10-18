// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { ArrowBack, Refresh } from '@mui/icons-material'

interface ErrorPageProps {
    mode: 'back' | 'refresh'
    title?: string | undefined
    message?: string | undefined
    onAction?: () => void | undefined
}

export const ErrorPage = ({
    mode,
    title = 'Something went wrong',
    message = 'An unexpected error occurred while loading this page.',
    onAction,
}: ErrorPageProps) => {
    const backButton = (
        <Button
            variant="contained"
            color="primary"
            startIcon={<ArrowBack />}
            onClick={onAction}
        >
            Back
        </Button>
    )

    const refreshButton = (
        <Button
            variant="contained"
            color="primary"
            startIcon={<Refresh />}
            onClick={onAction}
        >
            Refresh
        </Button>
    )

    return (
        <Paper>
            <Stack
                sx={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: 4,
                }}
            >
                <Box>
                    <WarningAmberIcon color="error" />
                </Box>
                <Box>
                    <Typography variant="h1">{title}</Typography>
                    <Typography variant="body1">{message}</Typography>
                </Box>
                <Box sx={{ mt: 4 }}>
                    {mode === 'back' ? backButton : refreshButton}
                </Box>
            </Stack>
        </Paper>
    )
}
