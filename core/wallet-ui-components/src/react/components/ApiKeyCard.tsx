// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ApiKey } from '@canton-network/core-wallet-user-rpc-client'
import {
    Button,
    Card,
    CardActions,
    CardContent,
    Grid,
    Typography,
    Box,
} from '@mui/material'

interface ApiKeyCardProps {
    apiKey: ApiKey
    onRevoke: () => void
}

export const ApiKeyCard = ({ apiKey, onRevoke }: ApiKeyCardProps) => {
    return (
        <Card>
            <CardContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body1">{apiKey.name}</Typography>
                </Box>
                <Grid container rowSpacing={1} columnSpacing={2}>
                    <Grid container size={12}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            ID:
                        </Typography>
                        <Typography variant="subtitle2">{apiKey.id}</Typography>
                    </Grid>

                    <Grid container size={12}>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            Created At:
                        </Typography>
                        <Typography variant="subtitle2">
                            {apiKey.createdAt}
                        </Typography>
                    </Grid>
                </Grid>
            </CardContent>
            <CardActions>
                <Button color="warning" onClick={() => onRevoke()}>
                    Revoke
                </Button>
            </CardActions>
        </Card>
    )
}
