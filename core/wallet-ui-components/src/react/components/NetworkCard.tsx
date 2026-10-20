// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { PublicNetwork } from '@canton-network/core-wallet-user-rpc-client'
import { Card, CardContent, Chip, Link, Stack, Typography } from '@mui/material'
import { CardDetailRow } from './CardDetailRow'
import { CopyButton } from './CopyButton'

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
                    <CardDetailRow label="ID" value={network.id} />
                    {activeSession && (
                        <CardDetailRow
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
                    <CardDetailRow label="Auth" value={network.authMethod} />
                    {syncId && (
                        <CardDetailRow
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
                        <CardDetailRow
                            label="Identity provider"
                            value={network.identityProviderId}
                        />
                    )}
                </Stack>
            </CardContent>
        </Card>
    )
}
