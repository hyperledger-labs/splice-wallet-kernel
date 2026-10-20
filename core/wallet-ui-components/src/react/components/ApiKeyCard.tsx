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
    Divider,
} from '@mui/material'
import { CardDetailRow } from './CardDetailRow'

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
                    <CardDetailRow label="ID" value={apiKey.id} />
                    <CardDetailRow
                        label="Created At"
                        value={apiKey.createdAt}
                    />
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
