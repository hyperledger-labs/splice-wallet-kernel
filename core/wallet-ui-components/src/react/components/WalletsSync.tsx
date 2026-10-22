// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { IconButton, Tooltip } from '@mui/material'
import { keyframes } from '@mui/material/styles'
import RefreshIcon from '@mui/icons-material/Refresh'

const spin = keyframes`
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
`

interface WalletsSyncProps {
    /** Highlights the button to show that there are changes to sync */
    syncNeeded?: boolean
    /** Shows a spinner and disables the button while a sync is in progress */
    syncing?: boolean
    /** Disables the button, e.g. while there is no API client yet */
    disabled?: boolean
    /** Called when the button is clicked; the caller does the sync, shows its result and refreshes the wallets */
    onSync: () => void
}

export const WalletsSync = ({
    syncNeeded = false,
    syncing = false,
    disabled = false,
    onSync,
}: WalletsSyncProps) => {
    const title = syncing
        ? 'Syncing parties...'
        : syncNeeded
          ? 'Refresh parties (changes available)'
          : 'Refresh parties'

    return (
        // describeChild: the button already carries the text as its name
        <Tooltip title={title} describeChild>
            {/* A disabled button doesn't fire the pointer events a tooltip needs */}
            <span>
                <IconButton
                    size="small"
                    aria-label={title}
                    color={syncNeeded ? 'primary' : 'default'}
                    disabled={disabled || syncing}
                    onClick={onSync}
                >
                    <RefreshIcon
                        fontSize="small"
                        sx={
                            syncing
                                ? {
                                      animation: `${spin} 1s linear infinite`,
                                      '@media (prefers-reduced-motion: reduce)':
                                          { animation: 'none' },
                                  }
                                : undefined
                        }
                    />
                </IconButton>
            </span>
        </Tooltip>
    )
}
