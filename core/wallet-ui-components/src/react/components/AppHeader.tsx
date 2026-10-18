// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    Box,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Typography,
    AppBar,
    Toolbar,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import { useState } from 'react'
import { CopyButton } from './CopyButton'

interface StatusDotProps {
    online: boolean
}

export const StatusDot = ({ online }: StatusDotProps) => {
    return (
        <Box
            sx={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                bgcolor: online ? 'success.main' : 'text.disabled',
            }}
        ></Box>
    )
}

interface AppHeaderProps {
    iconSrc?: string
    networkName?: string
    networkConnected?: boolean
    dappApiUrl?: string
    onLogout: () => void
    onDappApiUrlCopy: () => void
}

export const AppHeader = ({
    iconSrc = 'images/icon.png',
    networkName,
    networkConnected = false,
    dappApiUrl = '/api/v0/dapp',
    onLogout,
    onDappApiUrlCopy,
}: AppHeaderProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)

    return (
        <AppBar position="static" color="default">
            <Toolbar
                sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto 1fr',
                    alignItems: 'center',
                }}
            >
                <Box
                    component="img"
                    src={iconSrc}
                    alt="App Icon"
                    sx={{ height: 30, justifySelf: 'start' }}
                />

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    <StatusDot online={networkConnected} />
                    <Typography variant="subtitle1">
                        {networkName || 'No network connected'}
                    </Typography>
                </Box>

                <IconButton
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{ justifySelf: 'end' }}
                >
                    <MenuIcon />
                </IconButton>
            </Toolbar>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={() => setAnchorEl(null)}
            >
                {/** TODO: determine whether the menu items should be sourced from props, and whether or not this component should handle path redirects directly with tanstack, or leave it to a prop handler. */}
                <MenuItem onClick={() => setAnchorEl(null)}>Parties</MenuItem>
                <MenuItem onClick={() => setAnchorEl(null)}>
                    Activities
                </MenuItem>
                <MenuItem onClick={() => setAnchorEl(null)}>Networks</MenuItem>
                <MenuItem onClick={() => setAnchorEl(null)}>API Keys</MenuItem>
                <MenuItem onClick={() => setAnchorEl(null)}>
                    Identity Providers
                </MenuItem>
                <MenuItem onClick={() => setAnchorEl(null)}>
                    <Typography>Dapp API URL</Typography>
                    <CopyButton value={dappApiUrl} onCopy={onDappApiUrlCopy} />
                </MenuItem>

                <Divider />
                <MenuItem
                    onClick={() => {
                        setAnchorEl(null)
                        onLogout()
                    }}
                >
                    Logout
                </MenuItem>
            </Menu>
        </AppBar>
    )
}
