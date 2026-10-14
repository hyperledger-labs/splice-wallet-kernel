// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import { Box, Paper, Typography } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'
import { normalizeSx } from '@components/ui/utils'

type DashboardEmptyStateProps = {
    children: ReactNode
    minHeight?: number
    sx?: SxProps<Theme>
}

export function DashboardEmptyState({
    children,
    minHeight = 74,
    sx,
}: DashboardEmptyStateProps) {
    return (
        <Box
            component={Paper}
            elevation={0}
            sx={[
                {
                    minHeight,
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    px: 3,
                    py: 3,
                },
                ...normalizeSx(sx),
            ]}
        >
            <Typography variant="body1" color="text.primary">
                {children}
            </Typography>
        </Box>
    )
}
