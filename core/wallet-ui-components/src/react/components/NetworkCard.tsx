// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import type { PublicNetwork } from '@canton-network/core-wallet-user-rpc-client'
import {
    Box,
    Card,
    CardContent,
    Chip,
    Link,
    Stack,
    Typography,
} from '@mui/material'
import { CopyButton } from './CopyButton'

interface MetaRowProps {
    label: string
    value: string
    muted?: boolean
    /** Rendered after the value, e.g. a copy button */
    action?: ReactNode
}

const MetaRow = ({ label, value, muted = false, action }: MetaRowProps) => (
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
            sx={{ fontWeight: 'bold', flexShrink: 0, width: '6rem' }}
        >
            {label}
        </Typography>
        <Typography
            variant="body2"
            noWrap
            title={value}
            color={muted ? 'text.secondary' : 'text.primary'}
            sx={{ flex: 1, minWidth: 0, textAlign: 'right' }}
        >
            {value}
        </Typography>
        {/* Sits above the card's click overlay so the action stays clickable */}
        <Box sx={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
            {action}
        </Box>
    </Box>
)

interface NetworkCardProps {
    network: PublicNetwork
    /** Shows the "CONNECTED" badge and the access token row */
    activeSession?: boolean
    /** Value copied by the "Copy access token" button; only shown with `activeSession` */
    accessToken?: string
    /** Called when the card is clicked. The card is read-only (not clickable) when omitted */
    onReview?: (network: PublicNetwork) => void
}

export const NetworkCard = ({
    network,
    activeSession = false,
    accessToken = '',
    onReview,
}: NetworkCardProps) => {
    const syncId = network.synchronizerId ?? ''

    return (
        <Card
            component="article"
            data-testid="network-card"
            variant="outlined"
            sx={{
                position: 'relative',
                ...(onReview && {
                    '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: 2,
                    },
                }),
            }}
        >
            <CardContent>
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', mb: 1 }}
                >
                    {onReview ? (
                        // Stretched link: the overlay makes the whole card
                        // clickable without nesting buttons inside a button
                        <Link
                            component="button"
                            type="button"
                            variant="body1"
                            color="inherit"
                            underline="none"
                            onClick={() => onReview(network)}
                            sx={{
                                fontWeight: 'bold',
                                textAlign: 'left',
                                // MUI's button-style Link is `relative`, which
                                // would confine the overlay to the link itself
                                position: 'static',
                                '&::after': {
                                    content: '""',
                                    position: 'absolute',
                                    inset: 0,
                                    cursor: 'pointer',
                                },
                            }}
                        >
                            {network.name}
                        </Link>
                    ) : (
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {network.name}
                        </Typography>
                    )}
                    {activeSession && (
                        <Chip label="CONNECTED" color="success" size="small" />
                    )}
                </Stack>

                <Stack spacing={0.5}>
                    <MetaRow label="ID" value={network.id} />
                    {activeSession && (
                        <MetaRow
                            label="Access Token"
                            value="[private]"
                            muted
                            action={
                                <CopyButton
                                    value={accessToken}
                                    label="Copy access token"
                                />
                            }
                        />
                    )}
                    <MetaRow label="Auth" value={network.authMethod} />
                    {syncId && (
                        <MetaRow
                            label="Synchronizer"
                            value={syncId}
                            action={
                                <CopyButton
                                    value={syncId}
                                    label="Copy synchronizer ID"
                                />
                            }
                        />
                    )}
                    {network.identityProviderId && (
                        <MetaRow
                            label="Identity provider"
                            value={network.identityProviderId}
                        />
                    )}
                </Stack>
            </CardContent>
        </Card>
    )
}
