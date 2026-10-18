// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import {
    Box,
    Divider,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Typography,
    AppBar,
    Toolbar,
} from '@mui/material'
import MenuIcon from '@mui/icons-material/Menu'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import { useId, useState } from 'react'
import cantonLogo from '../../../images/logos/canton-logo.png'

interface StatusDotProps {
    online: boolean
}

export const StatusDot = ({ online }: StatusDotProps) => {
    return (
        <Box
            sx={{
                display: 'inline-block',
                flexShrink: 0,
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
    /** Called when the "Dapp API URL" menu item is clicked; the caller is responsible for copying the URL */
    onDappApiUrlCopy: () => void
}

export const AppHeader = ({
    iconSrc = cantonLogo,
    networkName = 'No network connected',
    networkConnected = false,
    dappApiUrl,
    onLogout,
    onDappApiUrlCopy,
}: AppHeaderProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)
    const menuId = useId()

    return (
        <AppBar position="sticky" color="default">
            <Toolbar
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                {/** TODO: make the logo a link to the home page once navigation is decided (see menu TODO below) */}
                <Box
                    component="img"
                    src={iconSrc}
                    alt="App Icon"
                    sx={{ height: 30, justifySelf: 'start' }}
                />

                <Box
                    title={networkName}
                    data-testid={`network-status-${networkConnected ? 'connected' : 'disconnected'}`}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        minWidth: 0,
                    }}
                >
                    <StatusDot online={networkConnected} />
                    <Typography variant="subtitle1" noWrap>
                        {networkName}
                    </Typography>
                </Box>

                <IconButton
                    aria-label="menu"
                    aria-controls={open ? menuId : undefined}
                    aria-haspopup="true"
                    aria-expanded={open ? 'true' : undefined}
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    sx={{ justifySelf: 'end' }}
                >
                    <MenuIcon />
                </IconButton>
            </Toolbar>

            <Menu
                id={menuId}
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
                <MenuItem
                    title={dappApiUrl || 'Copy dApp API URL'}
                    aria-label={
                        dappApiUrl
                            ? `Copy dApp API URL: ${dappApiUrl}`
                            : 'Copy dApp API URL'
                    }
                    onClick={() => {
                        setAnchorEl(null)
                        onDappApiUrlCopy()
                    }}
                >
                    <ListItemText>Dapp API URL</ListItemText>
                    <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                        <ContentCopyIcon fontSize="small" />
                    </ListItemIcon>
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
