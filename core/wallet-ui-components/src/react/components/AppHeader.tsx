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
    useTheme,
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

export interface AppHeaderNavItem {
    label: string
    href: string
}

export const defaultNavItems: AppHeaderNavItem[] = [
    { label: 'Parties', href: '/parties/' },
    { label: 'Activities', href: '/activities/' },
    { label: 'Networks', href: '/networks/' },
    { label: 'API Keys', href: '/api-keys/' },
    { label: 'Identity Providers', href: '/identity-providers/' },
]

/**
 * Navigation renders plain `href`s. Apps using a client-side router should set
 * `MuiButtonBase.defaultProps.LinkComponent` in their theme to an adapter around
 * the router's link component; without one, links are regular anchors.
 */
interface AppHeaderProps {
    iconSrc?: string
    networkName?: string
    networkConnected?: boolean
    dappApiUrl?: string
    /** Target of the logo link */
    homeHref?: string
    /** Links shown in the menu, above the Dapp API URL and Logout items. `defaultNavItems` has the wallet gateway's pages */
    navItems: AppHeaderNavItem[]
    onLogout: () => void
    /** Called when the "Dapp API URL" menu item is clicked; the caller is responsible for copying the URL. The item is hidden when omitted */
    onDappApiUrlCopy?: () => void
}

export const AppHeader = ({
    iconSrc = cantonLogo,
    networkName = 'No network connected',
    networkConnected = false,
    dappApiUrl,
    homeHref = '/',
    navItems,
    onLogout,
    onDappApiUrlCopy,
}: AppHeaderProps) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
    const open = Boolean(anchorEl)
    const menuId = useId()
    const closeMenu = () => setAnchorEl(null)
    // MenuItem renders an <li> by default, so pass the theme's link component explicitly
    const LinkComponent =
        useTheme().components?.MuiButtonBase?.defaultProps?.LinkComponent ?? 'a'

    return (
        <AppBar position="sticky" color="default">
            <Toolbar
                sx={{
                    display: 'grid',
                    // Side columns never shrink below their content; the middle one shrinks to make room
                    gridTemplateColumns:
                        'minmax(max-content, 1fr) minmax(0, auto) minmax(max-content, 1fr)',
                    alignItems: 'center',
                    gap: 1,
                }}
            >
                <IconButton
                    href={homeHref}
                    aria-label="Go to home"
                    sx={{ justifySelf: 'start', p: 0.5 }}
                >
                    <Box
                        component="img"
                        src={iconSrc}
                        alt=""
                        sx={{ height: 30, display: 'block' }}
                    />
                </IconButton>

                <Box
                    title={networkName}
                    data-testid={`network-status-${networkConnected ? 'connected' : 'disconnected'}`}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        minWidth: 0,
                        maxWidth: 'min(52vw, 420px)',
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
                onClose={closeMenu}
            >
                {navItems.map(({ label, href }) => (
                    <MenuItem
                        key={href}
                        component={LinkComponent}
                        href={href}
                        onClick={closeMenu}
                    >
                        {label}
                    </MenuItem>
                ))}
                {onDappApiUrlCopy && (
                    <MenuItem
                        title={dappApiUrl || 'Copy dApp API URL'}
                        aria-label={
                            dappApiUrl
                                ? `Copy dApp API URL: ${dappApiUrl}`
                                : 'Copy dApp API URL'
                        }
                        onClick={() => {
                            closeMenu()
                            onDappApiUrlCopy()
                        }}
                    >
                        <ListItemText>Dapp API URL</ListItemText>
                        <ListItemIcon sx={{ justifyContent: 'flex-end' }}>
                            <ContentCopyIcon fontSize="small" />
                        </ListItemIcon>
                    </MenuItem>
                )}

                <Divider />
                <MenuItem
                    onClick={() => {
                        closeMenu()
                        onLogout()
                    }}
                >
                    Logout
                </MenuItem>
            </Menu>
        </AppBar>
    )
}
