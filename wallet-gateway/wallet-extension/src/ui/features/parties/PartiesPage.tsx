// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

// Placeholder until the parties page is ported.
export function PartiesPage() {
    return (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                Parties
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Placeholder page.
            </Typography>
        </Stack>
    )
}
