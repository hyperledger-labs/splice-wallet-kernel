// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// Component overrides ported from examples/portfolio/src/lib/theme.ts.
// Colours come from `theme.vars` so they follow the active colour scheme.

import type { ThemeOptions } from '@mui/material/styles'

export const components: ThemeOptions['components'] = {
    MuiCssBaseline: {
        styleOverrides: (theme) => ({
            body: {
                backgroundColor: theme.vars.palette.background.default,
                color: theme.vars.palette.text.primary,
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
            },
            '::selection': {
                backgroundColor: theme.vars.palette.secondary.main,
                color: theme.vars.palette.secondary.contrastText,
            },
        }),
    },
}
