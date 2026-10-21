// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import RefreshIcon from '@mui/icons-material/Refresh'

interface ErrorPageProps {
    mode: 'back' | 'refresh'
    title?: string
    message?: string
    /** Called when the Back/Refresh button is clicked; the caller decides how to navigate or reload */
    onAction: () => void
}

export const ErrorPage = ({
    mode,
    title = 'Something went wrong',
    message = 'An unexpected error occurred while loading this page.',
    onAction,
}: ErrorPageProps) => {
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
                    <Typography variant="h5" component="h1">
                        {title}
                    </Typography>
                    <Typography variant="body1">{message}</Typography>
                </Box>
                <Box sx={{ mt: 4 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={
                            mode === 'back' ? (
                                <ArrowBackIcon />
                            ) : (
                                <RefreshIcon />
                            )
                        }
                        onClick={onAction}
                    >
                        {mode === 'back' ? 'Back' : 'Refresh'}
                    </Button>
                </Box>
            </Stack>
        </Paper>
    )
}
