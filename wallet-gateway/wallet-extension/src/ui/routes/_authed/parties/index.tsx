// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack, Typography } from '@mui/material'
import { createFileRoute } from '@tanstack/react-router'
import { ButtonLink } from '@/ui/components/ButtonLink'

export const Route = createFileRoute('/_authed/parties/')({
    component: PartiesPlaceholder,
})

// Placeholder until the parties page is ported.
function PartiesPlaceholder() {
    return (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                Parties
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Placeholder page.
            </Typography>
            <ButtonLink to="/login" variant="outlined">
                Go to login
            </ButtonLink>
        </Stack>
    )
}
