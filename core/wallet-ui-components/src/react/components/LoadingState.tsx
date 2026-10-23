// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Box, Stack, Typography } from '@mui/material'
import { keyframes } from '@mui/material/styles'

interface LoadingStateProps {
    /** @default 'Loading' */
    text?: string
}

const bounce = keyframes`
    0%, 80%, 100% {
        transform: scale(0.7);
        opacity: 0.4;
    }
    40% {
        transform: scale(1);
        opacity: 1;
    }
`

export const LoadingState = ({ text = 'Loading' }: LoadingStateProps) => (
    <Stack
        role="status"
        aria-live="polite"
        spacing={2}
        sx={{
            minHeight: 180,
            justifyContent: 'center',
            alignItems: 'center',
            p: 3,
        }}
    >
        <Stack direction="row" spacing={1} aria-hidden="true">
            {[0, 1, 2].map((i) => (
                <Box
                    key={i}
                    sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: 'primary.main',
                        animation: `${bounce} 1s infinite ease-in-out`,
                        animationDelay: `${i * 0.15}s`,
                        '@media (prefers-reduced-motion: reduce)': {
                            animation: 'none',
                        },
                    }}
                />
            ))}
        </Stack>
        <Typography variant="body1" color="text.secondary">
            {text}
        </Typography>
    </Stack>
)
