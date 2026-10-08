// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import {
    Box,
    Typography,
    type BoxProps,
    type SxProps,
    type Theme,
} from '@mui/material'
import { CopyableIdentifier } from '@components/copyable-identifier'
import { normalizeSx } from '@components/ui/utils'
import { formatDateTimeString, formatDistanceToNow } from '@utils/date-format'

interface OfferRowShellProps extends Omit<BoxProps, 'sx'> {
    children: ReactNode
    sx?: SxProps<Theme>
}

export function OfferRowShell({
    children,
    sx,
    ...boxProps
}: OfferRowShellProps) {
    return (
        <Box
            {...boxProps}
            sx={[
                {
                    width: '100%',
                    minHeight: 80,
                    p: 2,
                    display: 'grid',
                    justifyContent: 'stretch',
                    justifyItems: 'stretch',
                    alignItems: 'start',
                    color: 'text.primary',
                    textAlign: 'left',
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                },
                ...normalizeSx(sx),
            ]}
        >
            {children}
        </Box>
    )
}

interface OfferRowGridProps {
    children: ReactNode
    columns?: number
}

export function OfferRowGrid({ children, columns = 5 }: OfferRowGridProps) {
    return (
        <Box
            sx={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    md: `repeat(${columns}, minmax(0, 1fr))`,
                },
                gap: { xs: 2, md: 3 },
                alignItems: 'start',
            }}
        >
            {children}
        </Box>
    )
}

export function OfferDetailBlock({
    label,
    value,
}: {
    label: string
    value: string
}) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <OfferFieldLabel>{label}</OfferFieldLabel>
            <Typography
                variant="body1"
                sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {value}
            </Typography>
        </Box>
    )
}

interface OfferExpirationBlockProps {
    label: string
    expiration: string
}

export function OfferExpirationBlock({
    label,
    expiration,
}: OfferExpirationBlockProps) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <OfferFieldLabel>{label}</OfferFieldLabel>
            <Typography variant="body1" color="text.secondary">
                {formatDateTimeString(expiration)}
            </Typography>{' '}
            <Typography variant="body1">
                ({formatDistanceToNow(expiration)})
            </Typography>
        </Box>
    )
}

interface OfferPartyBlockProps {
    label: string
    value: string
}

export function OfferPartyBlock({ label, value }: OfferPartyBlockProps) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <OfferFieldLabel>{label}</OfferFieldLabel>
            <CopyableIdentifier value={value} maxLength={5} />
        </Box>
    )
}

export function OfferFieldLabel({ children }: { children: ReactNode }) {
    return (
        <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 0.75, textTransform: 'uppercase' }}
        >
            {children}
        </Typography>
    )
}
