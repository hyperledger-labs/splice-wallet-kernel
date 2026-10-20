// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'
import type { Idp } from '@canton-network/core-wallet-user-rpc-client'
import { Box, Card, CardContent, Link, Stack, Typography } from '@mui/material'
import { CopyButton } from './CopyButton'

interface MetaRowProps {
    label: string
    value: string
    /** Rendered after the value, e.g. a copy button */
    action?: ReactNode
}

const MetaRow = ({ label, value, action }: MetaRowProps) => (
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

interface IdpCardProps {
    idp: Idp
    /** Called when the card is clicked. The card is read-only (not clickable) when omitted */
    onReview?: (idp: Idp) => void
}

export const IdpCard = ({ idp, onReview }: IdpCardProps) => {
    const configUrl = 'configUrl' in idp ? idp.configUrl : ''

    return (
        <Card
            component="article"
            data-testid="idp-card"
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
                <Box sx={{ mb: 1 }}>
                    {onReview ? (
                        // Stretched link: the overlay makes the whole card
                        // clickable without nesting buttons inside a button
                        <Link
                            component="button"
                            type="button"
                            variant="body1"
                            color="inherit"
                            underline="none"
                            onClick={() => onReview(idp)}
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
                            {idp.id}
                        </Link>
                    ) : (
                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {idp.id}
                        </Typography>
                    )}
                </Box>

                <Stack spacing={0.5}>
                    <MetaRow label="Type" value={idp.type} />
                    {'issuer' in idp && (
                        <MetaRow
                            label="Issuer"
                            value={idp.issuer}
                            action={
                                <CopyButton
                                    value={idp.issuer}
                                    label="Copy issuer URL"
                                />
                            }
                        />
                    )}
                    {configUrl && (
                        <MetaRow
                            label="Config URL"
                            value={configUrl}
                            action={
                                <CopyButton
                                    value={configUrl}
                                    label="Copy config URL"
                                />
                            }
                        />
                    )}
                </Stack>
            </CardContent>
        </Card>
    )
}
