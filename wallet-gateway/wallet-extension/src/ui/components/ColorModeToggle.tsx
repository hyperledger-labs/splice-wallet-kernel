// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { useColorScheme } from '@mui/material/styles'

type Mode = 'light' | 'system' | 'dark'

export function ColorModeToggle() {
    const { mode, setMode } = useColorScheme()
    if (!mode) return null
    return (
        <ToggleButtonGroup
            size="small"
            exclusive
            value={mode}
            aria-label="Colour mode"
            onChange={(_, next: Mode | null) => {
                if (next) setMode(next)
            }}
        >
            <ToggleButton value="light">Light</ToggleButton>
            <ToggleButton value="system">System</ToggleButton>
            <ToggleButton value="dark">Dark</ToggleButton>
        </ToggleButtonGroup>
    )
}
