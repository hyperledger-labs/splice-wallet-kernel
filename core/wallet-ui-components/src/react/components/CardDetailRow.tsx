// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import { Box, Typography } from '@mui/material'

interface CardDetailRowProps {
    label: string
    /** Text is truncated with an ellipsis; any other node (e.g. chips) is right-aligned and wraps */
    value: ReactNode
    /** Tooltip for a text value. Defaults to the value; set it when `value` is shortened */
    title?: string
    /** Renders the value in the secondary text colour, e.g. for masked values */
    muted?: boolean
    /** Rendered after the value, e.g. a copy button */
    action?: ReactNode
}

export const CardDetailRow = ({
    label,
    value,
    title = typeof value === 'string' ? value : undefined,
    muted = false,
    action,
}: CardDetailRowProps) => {
    const isText = typeof value === 'string'

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                minWidth: 0,
                minHeight: 40,
            }}
        >
            <Typography
                variant="body2"
                noWrap
                sx={{ fontWeight: 'bold', flexShrink: 0, minWidth: '8rem' }}
            >
                {label}
            </Typography>
            <Typography
                variant="body2"
                // A div, so block content such as chips is valid inside it
                component="div"
                noWrap={isText}
                title={isText ? title : undefined}
                color={muted ? 'text.secondary' : 'text.primary'}
                sx={{
                    flex: 1,
                    minWidth: 0,
                    textAlign: 'right',
                    ...(!isText && {
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 0.5,
                    }),
                }}
            >
                {value}
            </Typography>
            {action && (
                // Sits above a card's click overlay so the action stays clickable
                <Box sx={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
                    {action}
                </Box>
            )}
        </Box>
    )
}
