// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import {
    Avatar,
    Box,
    ButtonBase,
    Paper,
    Skeleton,
    Typography,
} from '@mui/material'
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import type { SxProps, Theme } from '@mui/material/styles'
import { normalizeSx } from '@components/ui/utils'
import { formatAmount } from '@utils/decimal'

type AssetsPanelProps = {
    children: ReactNode
    grid?: boolean
    sx?: SxProps<Theme>
}

export function AssetsPanel({ children, grid = false, sx }: AssetsPanelProps) {
    return (
        <Box
            component={Paper}
            elevation={0}
            sx={[
                {
                    display: 'grid',
                    gridTemplateColumns: grid
                        ? {
                              xs: '1fr',
                              md: 'repeat(2, minmax(0, 1fr))',
                              xl: 'repeat(3, minmax(0, 1fr))',
                          }
                        : '1fr',
                    gap: grid ? 2 : 2.5,
                    bgcolor: 'background.paper',
                    borderRadius: 1,
                    p: 3,
                },
                ...normalizeSx(sx),
            ]}
        >
            {children}
        </Box>
    )
}

type AssetBalanceCardProps = {
    name: string
    symbol: string
    totalAmount: string
    lockedAmount: string
    unlockedAmount: string
    initials: string
    onClick?: () => void
    ariaLabel?: string
}

export function AssetBalanceCard({
    name,
    symbol,
    totalAmount,
    lockedAmount,
    unlockedAmount,
    initials,
    onClick,
    ariaLabel,
}: AssetBalanceCardProps) {
    const formattedTotalAmount = formatAmount(totalAmount)
    const formattedLockedAmount = formatAmount(lockedAmount)
    const formattedUnlockedAmount = formatAmount(unlockedAmount)
    const balanceSummaryLabel = `Total balance: ${formattedTotalAmount} ${symbol}. Locked balance: ${formattedLockedAmount} ${symbol}. Unlocked balance: ${formattedUnlockedAmount} ${symbol}.`

    const content = (
        <>
            <Box
                sx={{
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                }}
            >
                <Avatar
                    aria-hidden="true"
                    sx={{
                        width: 28,
                        height: 28,
                        bgcolor: 'text.primary',
                        color: 'background.default',
                        fontSize: 12,
                        fontWeight: 700,
                    }}
                >
                    {initials}
                </Avatar>
                <Typography
                    variant="body1"
                    sx={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {name}
                </Typography>
            </Box>

            <Typography
                variant="body1"
                aria-label={`Total balance: ${formattedTotalAmount} ${symbol}`}
                sx={{ mt: 1.25, whiteSpace: 'nowrap' }}
            >
                {formattedTotalAmount} {symbol}
            </Typography>

            <Box
                sx={{
                    mt: 0.75,
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1.25,
                }}
            >
                <BalanceBreakdownItem
                    icon={<LockOutlinedIcon sx={{ fontSize: 14 }} />}
                    label="Locked balance"
                    amount={formattedLockedAmount}
                    symbol={symbol}
                />
                <BalanceBreakdownItem
                    icon={<LockOpenOutlinedIcon sx={{ fontSize: 14 }} />}
                    label="Unlocked balance"
                    amount={formattedUnlockedAmount}
                    symbol={symbol}
                />
            </Box>
        </>
    )

    const cardSx: SxProps<Theme> = {
        width: '100%',
        minHeight: 94,
        px: 2,
        py: 1.5,
        display: 'block',
        color: 'text.primary',
        textAlign: 'left',
        border: (theme) => `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        transition: (theme) =>
            theme.transitions.create(
                ['background-color', 'border-color', 'transform'],
                { duration: theme.transitions.duration.short }
            ),
        '&:hover': onClick
            ? {
                  bgcolor: 'action.hover',
                  borderColor: 'text.secondary',
              }
            : undefined,
        '&.Mui-focusVisible': {
            outline: (theme) => `2px solid ${theme.palette.secondary.main}`,
            outlineOffset: 2,
        },
        '&:active': onClick
            ? {
                  transform: 'scale(0.99)',
              }
            : undefined,
    }

    if (onClick) {
        return (
            <Box
                component={ButtonBase}
                type="button"
                aria-haspopup="dialog"
                aria-label={
                    ariaLabel
                        ? `${ariaLabel}. ${balanceSummaryLabel}`
                        : balanceSummaryLabel
                }
                onClick={onClick}
                sx={cardSx}
            >
                {content}
            </Box>
        )
    }

    return <Box sx={cardSx}>{content}</Box>
}

type BalanceBreakdownItemProps = {
    icon: ReactNode
    label: string
    amount: string
    symbol: string
}

function BalanceBreakdownItem({
    icon,
    label,
    amount,
    symbol,
}: BalanceBreakdownItemProps) {
    return (
        <Box
            component="span"
            aria-label={`${label}: ${amount} ${symbol}`}
            sx={{
                minWidth: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                color: 'text.secondary',
            }}
        >
            <Box
                component="span"
                aria-hidden="true"
                sx={{ display: 'inline-flex', color: 'inherit' }}
            >
                {icon}
            </Box>
            <Typography
                component="span"
                variant="caption"
                aria-hidden="true"
                sx={{
                    minWidth: 0,
                    lineHeight: 1.4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {amount} {symbol}
            </Typography>
        </Box>
    )
}

export function AssetBalanceCardSkeleton() {
    return (
        <Box
            sx={{
                minHeight: 94,
                px: 2,
                py: 1.5,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Skeleton variant="circular" width={28} height={28} />
                <Skeleton variant="text" width={160} />
            </Box>
            <Skeleton variant="text" width={180} sx={{ mt: 1.25 }} />
            <Box sx={{ mt: 0.75, display: 'flex', gap: 1.25 }}>
                <Skeleton variant="text" width={120} />
                <Skeleton variant="text" width={120} />
            </Box>
        </Box>
    )
}
