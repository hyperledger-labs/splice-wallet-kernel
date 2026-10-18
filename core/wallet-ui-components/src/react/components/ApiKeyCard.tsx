// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ApiKey } from '@canton-network/core-wallet-user-rpc-client'
import {
    Button,
    Card,
    CardActions,
    CardContent,
    Stack,
    Typography,
    Box,
    Divider,
} from '@mui/material'

interface MetaRowProps {
    label: string
    value: string
}

const MetaRow = ({ label, value }: MetaRowProps) => (
    <Box
        sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            minWidth: 0,
        }}
    >
        <Typography
            variant="body2"
            noWrap
            sx={{ fontWeight: 'bold', flexShrink: 0 }}
        >
            {label}
        </Typography>
        <Typography variant="body2" noWrap title={value}>
            {value}
        </Typography>
    </Box>
)

interface ApiKeyCardProps {
    apiKey: ApiKey
    onRevoke: (apiKey: ApiKey) => void
}

export const ApiKeyCard = ({ apiKey, onRevoke }: ApiKeyCardProps) => {
    return (
        <Card>
            <CardContent>
                <Typography variant="body1" sx={{ mb: 2, fontWeight: 'bold' }}>
                    {apiKey.name}
                </Typography>
                <Stack spacing={1}>
                    <MetaRow label="ID" value={apiKey.id} />
                    <MetaRow label="Created At" value={apiKey.createdAt} />
                </Stack>
            </CardContent>
            <Divider />
            <CardActions>
                <Button color="error" onClick={() => onRevoke(apiKey)}>
                    Revoke
                </Button>
            </CardActions>
        </Card>
    )
}
