// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, waitForElementToBeRemoved, within } from 'storybook/test'
import { AppHeader } from './AppHeader'

const meta: Meta = {
    title: 'AppHeader',
    component: AppHeader,
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    args: {
        networkName: 'DevNet',
        networkConnected: true,
        onLogout: fn(),
    },
    play: async ({ args, canvas, canvasElement, userEvent }) => {
        const menuButton = canvas.getByRole('button', { name: 'menu' })
        await userEvent.click(menuButton)

        // Menu is portaled to <body>, outside the story canvas
        const body = within(canvasElement.ownerDocument.body)
        const logoutButton = await body.findByRole('menuitem', {
            name: 'Logout',
        })

        await userEvent.click(logoutButton)
        expect(args.onLogout).toHaveBeenCalled()

        await userEvent.click(menuButton)
        expect(await body.findByRole('menu')).toBeInTheDocument()

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
}
