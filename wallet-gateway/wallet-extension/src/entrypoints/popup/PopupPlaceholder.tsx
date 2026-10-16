// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Button, Stack, Typography } from '@mui/material'
import { ColorModeToggle } from '@/ui/components/ColorModeToggle'

// Temporary page for checking the theme until routing lands.
export function PopupPlaceholder() {
    return (
        <Box sx={{ width: 360, p: 3 }}>
            <Stack spacing={2}>
                <Typography
                    variant="h5"
                    component="h1"
                    sx={{ fontWeight: 600 }}
                >
                    Wallet
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Theme preview. Switch modes to check light and dark.
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Button variant="contained" color="primary">
                        Primary
                    </Button>
                    <Button variant="contained" color="secondary">
                        Secondary
                    </Button>
                </Stack>
                <ColorModeToggle />
            </Stack>
        </Box>
    )
}
