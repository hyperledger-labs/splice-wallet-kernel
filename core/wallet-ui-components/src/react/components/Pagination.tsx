// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { IconButton, Stack, Typography } from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

interface PaginationProps {
    /** Total number of items across all pages */
    total: number
    /** @default 5 */
    pageSize?: number
    /** Current 1-based page. Out-of-range values are clamped for display. @default 1 */
    page?: number
    /** Called with the requested 1-based page when Previous/Next is clicked */
    onPageChange: (page: number) => void
}

export const Pagination = ({
    total,
    pageSize = 5,
    page = 1,
    onPageChange,
}: PaginationProps) => {
    const size = Math.max(pageSize, 1)
    const maxPage = Math.max(1, Math.ceil(total / size))
    const current = Math.min(Math.max(page, 1), maxPage)

    const start = total > 0 ? (current - 1) * size + 1 : 0
    const end = total > 0 ? Math.min(start + size - 1, total) : 0

    return (
        <Stack
            component="nav"
            aria-label="Pagination"
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', display: 'inline-flex' }}
        >
            <IconButton
                size="small"
                aria-label="Previous page"
                disabled={current <= 1}
                onClick={() => onPageChange(current - 1)}
            >
                <ArrowBackIcon fontSize="small" />
            </IconButton>
            <Typography variant="body2" component="span">
                {start}-{end} of {total}
            </Typography>
            <IconButton
                size="small"
                aria-label="Next page"
                disabled={current >= maxPage}
                onClick={() => onPageChange(current + 1)}
            >
                <ArrowForwardIcon fontSize="small" />
            </IconButton>
        </Stack>
    )
}
