// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    Alert,
    Box,
    Button,
    FormControlLabel,
    Paper,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material'
import { CopyableIdentifier } from '@components/copyable-identifier'
import { usePrimaryAccount } from '@hooks/useAccounts'
import {
    formatInstrumentName,
    usePreapprovalRows,
} from '@hooks/usePreapprovalRows'
import { usePreapprovalStatuses } from '@hooks/usePreapprovalStatuses'
import { useTogglePreapproval } from '@hooks/useTogglePreapproval'
import { useWalletSdk } from '@hooks/useWalletSdk'
import type { PreapprovalRow } from '../../types/preapprovals'

export function PreapprovalsSection() {
    const primaryParty = usePrimaryAccount()?.partyId
    const {
        sdk,
        isLoading: isWalletSdkLoading,
        error: walletSdkError,
        refresh,
    } = useWalletSdk()
    const rows = usePreapprovalRows()
    const statuses = usePreapprovalStatuses({
        rows,
        primaryParty,
        sdk,
    })
    const togglePreapprovalMutation = useTogglePreapproval({
        primaryParty,
        sdk,
    })

    return (
        <Box
            component="section"
            aria-labelledby="preapprovals-heading"
            sx={{ mb: 3.5 }}
        >
            <Box sx={{ mb: 2 }}>
                <Typography
                    id="preapprovals-heading"
                    variant="h5"
                    component="h2"
                >
                    Pre-approved Assets
                </Typography>
            </Box>

            {!primaryParty && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    Connect a wallet to manage preapprovals.
                </Alert>
            )}
            {walletSdkError && (
                <Alert
                    severity="error"
                    action={
                        <Button color="inherit" size="small" onClick={refresh}>
                            Retry
                        </Button>
                    }
                    sx={{ mb: 2 }}
                >
                    Wallet SDK failed to initialize: {walletSdkError}
                </Alert>
            )}

            <TableContainer
                component={Paper}
                variant="outlined"
                sx={{
                    // Header plus five body rows. Additional rows remain scrollable,
                    // but the scrollbar is hidden to match the dashboard surface.
                    maxHeight: 430,
                    bgcolor: 'background.paper',
                    backgroundImage: 'none',
                    borderColor: 'divider',
                    borderRadius: 1,
                    overflowX: 'hidden',
                    overflowY: rows.length > 5 ? 'auto' : 'hidden',
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                }}
            >
                <Table
                    stickyHeader
                    aria-label="Pre-approved assets"
                    sx={{ width: '100%', tableLayout: 'fixed' }}
                >
                    <TableHead>
                        <TableRow>
                            <HeaderCell width="25%">Asset</HeaderCell>
                            <HeaderCell width="25%">Registry URL</HeaderCell>
                            <HeaderCell width="25%">Admin Party</HeaderCell>
                            <HeaderCell width={220}>Action</HeaderCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.length > 0 ? (
                            rows.map((row, index) => {
                                const status = statuses[index]
                                const hasError = status.isError
                                const enabled = status.isEnabled
                                // A failed status read is "resolved" (we stop
                                // showing "Checking...") but the ledger state
                                // is unknown, so never present it as Disabled.
                                const hasResolvedStatus = !status.isLoading
                                const isInitialCheck =
                                    !hasResolvedStatus || isWalletSdkLoading
                                const isUpdating =
                                    togglePreapprovalMutation.isPending &&
                                    togglePreapprovalMutation.variables?.row
                                        .key === row.key
                                const disabled =
                                    !primaryParty ||
                                    !sdk ||
                                    !hasResolvedStatus ||
                                    hasError ||
                                    togglePreapprovalMutation.isPending
                                const statusLabel = isUpdating
                                    ? 'Updating...'
                                    : isInitialCheck
                                      ? 'Checking...'
                                      : enabled
                                        ? 'Enabled'
                                        : 'Disabled'

                                return (
                                    <TableRow
                                        key={row.key}
                                        sx={{
                                            '&:last-child td': {
                                                borderBottom: 0,
                                            },
                                        }}
                                    >
                                        <BodyCell>
                                            <Typography
                                                variant="body1"
                                                sx={{ mb: 0.75 }}
                                            >
                                                {formatInstrumentName(
                                                    row.instrument
                                                )}
                                            </Typography>
                                            <CopyableIdentifier
                                                value={row.instrument.id}
                                                maxLength={24}
                                            />
                                        </BodyCell>
                                        <BodyCell>
                                            <CopyableIdentifier
                                                value={row.registryUrl}
                                                maxLength={30}
                                            />
                                        </BodyCell>
                                        <BodyCell>
                                            <CopyableIdentifier
                                                value={row.registryPartyId}
                                                maxLength={24}
                                            />
                                        </BodyCell>
                                        <BodyCell width={220}>
                                            {hasError ? (
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                    }}
                                                >
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            color: 'error.main',
                                                        }}
                                                    >
                                                        Status unavailable
                                                    </Typography>
                                                    <Button
                                                        color="inherit"
                                                        size="small"
                                                        onClick={() =>
                                                            status.refetch()
                                                        }
                                                    >
                                                        Retry
                                                    </Button>
                                                </Box>
                                            ) : (
                                                <PreapprovalSwitch
                                                    checked={enabled}
                                                    disabled={disabled}
                                                    label={statusLabel}
                                                    row={row}
                                                    onToggle={(nextEnabled) =>
                                                        togglePreapprovalMutation.mutate(
                                                            {
                                                                row,
                                                                enabled:
                                                                    nextEnabled,
                                                            }
                                                        )
                                                    }
                                                />
                                            )}
                                        </BodyCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} sx={{ px: 2, py: 4 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: 'text.secondary',
                                            textAlign: 'center',
                                        }}
                                    >
                                        No instruments found for configured
                                        registries
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    )
}

interface PreapprovalSwitchProps {
    checked: boolean
    disabled: boolean
    label: string
    row: PreapprovalRow
    onToggle: (checked: boolean) => void
}

function PreapprovalSwitch({
    checked,
    disabled,
    label,
    row,
    onToggle,
}: PreapprovalSwitchProps) {
    return (
        <FormControlLabel
            control={
                <Switch
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => onToggle(event.target.checked)}
                    slotProps={{
                        input: {
                            'aria-label': `${checked ? 'Disable' : 'Enable'} preapproval for ${formatInstrumentName(row.instrument)}`,
                        },
                    }}
                    sx={{
                        width: 34,
                        height: 18,
                        p: 0,
                        '& .MuiSwitch-switchBase': {
                            p: 0.25,
                            '&.Mui-checked': {
                                transform: 'translateX(16px)',
                                color: 'text.primary',
                                '& + .MuiSwitch-track': {
                                    bgcolor: 'secondary.main',
                                    opacity: 1,
                                },
                            },
                            '&.Mui-focusVisible .MuiSwitch-thumb': {
                                outline: (theme) =>
                                    `2px solid ${theme.palette.secondary.main}`,
                                outlineOffset: 2,
                            },
                        },
                        '& .MuiSwitch-thumb': {
                            width: 14,
                            height: 14,
                            bgcolor: 'text.primary',
                            boxShadow: 'none',
                        },
                        '& .MuiSwitch-track': {
                            borderRadius: 999,
                            bgcolor: 'action.disabledBackground',
                            opacity: 1,
                        },
                    }}
                />
            }
            label={label}
            sx={{
                m: 0,
                color: disabled && !checked ? 'text.disabled' : 'text.primary',
                gap: 0.75,
                '& .MuiFormControlLabel-label': {
                    typography: 'body2',
                },
            }}
        />
    )
}

interface CellProps {
    children: React.ReactNode
    width?: string | number
}

function HeaderCell({ children, width }: CellProps) {
    return (
        <TableCell
            sx={{
                px: 2,
                py: 1.75,
                bgcolor: 'background.paper',
                color: 'text.primary',
                fontSize: 12,
                fontWeight: 500,
                textTransform: 'uppercase',
                width,
            }}
        >
            {children}
        </TableCell>
    )
}

function BodyCell({ children, width }: CellProps) {
    return (
        <TableCell
            sx={{
                px: 2,
                py: 2.25,
                color: 'text.primary',
                verticalAlign: 'middle',
                width,
            }}
        >
            {children}
        </TableCell>
    )
}
