// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Stack, Typography } from '@mui/material'
import { createFileRoute } from '@tanstack/react-router'
import { ButtonLink } from '@/ui/components/ButtonLink'

export const Route = createFileRoute('/login')({
    component: LoginPlaceholder,
})

// Placeholder until the login page is ported.
function LoginPlaceholder() {
    return (
        <Stack spacing={2} sx={{ p: 3, alignItems: 'flex-start' }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
                Log in
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Placeholder page.
            </Typography>
            <ButtonLink to="/parties" variant="contained">
                Continue
            </ButtonLink>
        </Stack>
    )
}
