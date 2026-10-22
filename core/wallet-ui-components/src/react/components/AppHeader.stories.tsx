// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { createTheme, ThemeProvider } from '@mui/material'
import { forwardRef, type AnchorHTMLAttributes } from 'react'
import { expect, fn, waitForElementToBeRemoved, within } from 'storybook/test'
import { AppHeader, defaultNavItems } from './AppHeader'

const meta: Meta = {
    title: 'AppHeader',
    component: AppHeader,
    args: {
        navItems: defaultNavItems,
        onLogout: fn(),
        onDappApiUrlCopy: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    args: {
        networkName: 'DevNet',
        networkConnected: true,
        dappApiUrl: 'http://localhost:3030/api/v0/dapp',
    },
    play: async ({ args, canvas, canvasElement, userEvent }) => {
        await expect(
            canvas.getByTestId('network-status-connected')
        ).toBeInTheDocument()

        await expect(
            canvas.getByRole('link', { name: 'Go to home' })
        ).toHaveAttribute('href', '/')

        const menuButton = canvas.getByRole('button', { name: 'menu' })
        await userEvent.click(menuButton)

        // Menu is portaled to <body>, outside the story canvas
        const body = within(canvasElement.ownerDocument.body)
        for (const { label, href } of defaultNavItems) {
            const item = await body.findByRole('menuitem', { name: label })
            await expect(item.tagName).toBe('A')
            await expect(item).toHaveAttribute('href', href)
        }

        const logoutButton = await body.findByRole('menuitem', {
            name: 'Logout',
        })

        await userEvent.click(logoutButton)
        await expect(args.onLogout).toHaveBeenCalled()

        await userEvent.click(menuButton)
        const copyItem = await body.findByRole('menuitem', {
            name: `Copy dApp API URL: ${args.dappApiUrl}`,
        })
        await userEvent.click(copyItem)
        await expect(args.onDappApiUrlCopy).toHaveBeenCalled()

        await userEvent.click(menuButton)
        const menu = await body.findByRole('menu')
        await userEvent.keyboard('{Escape}')
        await waitForElementToBeRemoved(menu)
    },
}

export const Disconnected: Story = {
    args: {
        networkName: undefined,
        networkConnected: false,
    },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByTestId('network-status-disconnected')
        ).toHaveTextContent('No network connected')
    },
}

export const CustomNavItems: Story = {
    args: {
        homeHref: '/wallet/',
        navItems: [
            { label: 'Parties', href: '/wallet/parties/' },
            { label: 'Settings', href: '/wallet/settings/' },
        ],
    },
    play: async ({ canvas, canvasElement, userEvent }) => {
        await expect(
            canvas.getByRole('link', { name: 'Go to home' })
        ).toHaveAttribute('href', '/wallet/')

        await userEvent.click(canvas.getByRole('button', { name: 'menu' }))
        const body = within(canvasElement.ownerDocument.body)
        await expect(
            await body.findByRole('menuitem', { name: 'Settings' })
        ).toHaveAttribute('href', '/wallet/settings/')
        await expect(
            body.queryByRole('menuitem', { name: 'Networks' })
        ).not.toBeInTheDocument()
    },
}

export const WithoutApiKeysAndDappUrl: Story = {
    // e.g. the browser extension's menu
    args: {
        navItems: defaultNavItems.filter((i) => i.href !== '/api-keys/'),
        onDappApiUrlCopy: undefined,
    },
    play: async ({ args, canvas, canvasElement, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'menu' }))
        const body = within(canvasElement.ownerDocument.body)

        await expect(
            await body.findByRole('menuitem', { name: 'Parties' })
        ).toBeInTheDocument()
        await expect(
            body.queryByRole('menuitem', { name: 'API Keys' })
        ).not.toBeInTheDocument()
        await expect(
            body.queryByRole('menuitem', { name: /Copy dApp API URL/ })
        ).not.toBeInTheDocument()

        await userEvent.click(body.getByRole('menuitem', { name: 'Logout' }))
        await expect(args.onLogout).toHaveBeenCalled()
    },
}

const onNavigate = fn()

/** Stands in for a router link adapter, e.g. around TanStack Router's <Link to={href}> */
const RouterLink = forwardRef<
    HTMLAnchorElement,
    AnchorHTMLAttributes<HTMLAnchorElement>
>(({ href, onClick, ...props }, ref) => (
    <a
        ref={ref}
        href={`#${href}`}
        onClick={(e) => {
            onClick?.(e)
            e.preventDefault()
            onNavigate(href)
        }}
        {...props}
    />
))

const routerTheme = createTheme({
    components: {
        MuiButtonBase: { defaultProps: { LinkComponent: RouterLink } },
    },
})

export const WithRouterLinkComponent: Story = {
    decorators: [
        (Story) => (
            <ThemeProvider theme={routerTheme}>
                <Story />
            </ThemeProvider>
        ),
    ],
    beforeEach: () => {
        onNavigate.mockClear()
    },
    play: async ({ canvas, canvasElement, userEvent }) => {
        const home = canvas.getByRole('link', { name: 'Go to home' })
        await expect(home).toHaveAttribute('href', '#/')
        await userEvent.click(home)
        await expect(onNavigate).toHaveBeenLastCalledWith('/')

        const menuButton = canvas.getByRole('button', { name: 'menu' })
        await userEvent.click(menuButton)
        const body = within(canvasElement.ownerDocument.body)
        const networks = await body.findByRole('menuitem', {
            name: 'Networks',
        })
        await expect(networks).toHaveAttribute('href', '#/networks/')

        const menu = await body.findByRole('menu')
        await userEvent.click(networks)
        await expect(onNavigate).toHaveBeenLastCalledWith('/networks/')
        await waitForElementToBeRemoved(menu)
    },
}
