// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createTheme } from '@mui/material/styles'
import { components } from './components'
import { darkScheme, lightScheme } from './tokens'

export const theme = createTheme({
    cssVariables: { colorSchemeSelector: 'class' },
    colorSchemes: { light: lightScheme, dark: darkScheme },
    defaultColorScheme: 'dark',
    typography: {
        fontFamily: 'Inter, sans-serif',
    },
    components,
})
