// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import type { Wallet } from '@canton-network/core-wallet-user-rpc-client'
import {
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Chip,
    Stack,
    Typography,
} from '@mui/material'
import { CardDetailRow } from './CardDetailRow'
import { CopyButton } from './CopyButton'

// Rights are shown in this fixed order. The generated `PartyLevelRight` type is
// `any`, so rights are compared as plain strings
const RIGHTS = ['CanActAs', 'CanReadAs', 'CanExecuteAs']

const REASON_STACK_LENGTH = 72
const PARTY_ID_EXCERPT_LENGTH = 24

const excerpt = (partyId: string) =>
    partyId.length > PARTY_ID_EXCERPT_LENGTH
        ? `${partyId.slice(0, 10)}...${partyId.slice(-10)}`
        : partyId

const Label = ({ children }: { children: string }) => (
    <Typography
        variant="body2"
        noWrap
        sx={{ fontWeight: 'bold', flexShrink: 0, width: '8rem' }}
    >
        {children}
    </Typography>
)

interface WalletCardProps {
    wallet: Wallet
    /** Whether the party has been allocated. Unverified wallets offer "Allocate party" instead of "Set as primary" and "Edit" */
    verified?: boolean
    /** Disables the action buttons, e.g. while a request is in flight */
    loading?: boolean
    /** Called when "Allocate party" is clicked (unverified wallets). The button is hidden when omitted */
    onAllocate?: (wallet: Wallet) => void
    /** Called when "Set as primary" is clicked (verified, non-primary, enabled wallets). The button is hidden when omitted */
    onSetPrimary?: (wallet: Wallet) => void
    /** Called when "Edit" is clicked (verified wallets). The button is hidden when omitted */
    onEdit?: (wallet: Wallet) => void
    /** Called when the select button is clicked. When set, it replaces all other actions and the badge */
    onSelect?: (wallet: Wallet) => void
    /** Label of the select button @default 'Select' */
    selectLabel?: string
}

export const WalletCard = ({
    wallet,
    verified = false,
    loading = false,
    onAllocate,
    onSetPrimary,
    onEdit,
    onSelect,
    selectLabel = 'Select',
}: WalletCardProps) => {
    const rights = new Set<string>(wallet.rights)
    const shownRights = RIGHTS.filter((right) => rights.has(right))
    const stackReason = Boolean(
        wallet.reason &&
        (wallet.reason.length > REASON_STACK_LENGTH ||
            wallet.reason.includes('\n'))
    )

    const badge = wallet.primary ? (
        <Chip key="badge" label="PRIMARY" color="success" size="small" />
    ) : wallet.disabled ? (
        <Chip key="badge" label="Disabled" color="error" size="small" />
    ) : null

    const actions: ReactNode[] = []
    if (onSelect) {
        actions.push(
            <Button
                key="select"
                size="small"
                disabled={loading}
                onClick={() => onSelect(wallet)}
            >
                {selectLabel}
            </Button>
        )
    } else {
        actions.push(badge)
        if (verified) {
            if (!wallet.primary && !wallet.disabled && onSetPrimary) {
                actions.push(
                    <Button
                        key="set-primary"
                        size="small"
                        disabled={loading}
                        onClick={() => onSetPrimary(wallet)}
                    >
                        Set as primary
                    </Button>
                )
            }
            if (onEdit) {
                actions.push(
                    <Button
                        key="edit"
                        size="small"
                        disabled={loading}
                        onClick={() => onEdit(wallet)}
                    >
                        Edit
                    </Button>
                )
            }
        } else if (onAllocate) {
            actions.push(
                <Button
                    key="allocate"
                    size="small"
                    variant="outlined"
                    color="inherit"
                    disabled={loading || wallet.disabled === true}
                    onClick={() => onAllocate(wallet)}
                >
                    Allocate party
                </Button>
            )
        }
    }
    const hasActions = actions.some(Boolean)

    return (
        <Card
            component="article"
            variant="outlined"
            data-testid="wallet-card"
            // Hook used by the e2e helpers to find a card by party
            party-id={wallet.partyId}
            sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            <CardContent sx={{ flexGrow: 1 }}>
                <Stack
                    spacing={0.5}
                    data-test-external-tx-id={wallet.externalTxId ?? ''}
                >
                    <CardDetailRow
                        label="Party hint"
                        value={wallet.hint || '-'}
                        action={
                            wallet.hint ? (
                                <CopyButton
                                    value={wallet.hint}
                                    label="Copy party hint"
                                />
                            ) : undefined
                        }
                    />
                    <CardDetailRow
                        label="Party ID"
                        value={excerpt(wallet.partyId)}
                        title={wallet.partyId}
                        action={
                            <CopyButton
                                value={wallet.partyId}
                                label="Copy party ID"
                            />
                        }
                    />
                    <CardDetailRow
                        label="Signing provider"
                        value={wallet.signingProviderId}
                    />
                    {wallet.reason &&
                        (stackReason ? (
                            <Box sx={{ minHeight: 40, py: 0.5 }}>
                                <Label>Reason</Label>
                                <Typography
                                    variant="body2"
                                    title={wallet.reason}
                                    sx={{ whiteSpace: 'pre-wrap' }}
                                >
                                    {wallet.reason}
                                </Typography>
                            </Box>
                        ) : (
                            <CardDetailRow
                                label="Reason"
                                value={wallet.reason}
                            />
                        ))}
                    {shownRights.length > 0 && (
                        <CardDetailRow
                            label="Permissions"
                            value={shownRights.map((right) => (
                                <Chip key={right} label={right} size="small" />
                            ))}
                        />
                    )}
                </Stack>
            </CardContent>
            {hasActions && (
                <CardActions sx={{ justifyContent: 'space-between' }}>
                    {actions}
                </CardActions>
            )}
        </Card>
    )
}
