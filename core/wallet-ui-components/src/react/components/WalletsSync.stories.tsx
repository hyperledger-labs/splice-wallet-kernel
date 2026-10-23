// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, waitFor, within } from 'storybook/test'
import { ToastProvider } from '../contexts/ToastProvider'
import { useErrorToast } from '../hooks/useErrorToast'
import { useToast } from '../hooks/useToast'
import { WalletsSync } from './WalletsSync'

const meta: Meta = {
    title: 'WalletsSync',
    component: WalletsSync,
    args: {
        onSync: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const UpToDate: Story = {
    play: async ({ args, canvas, userEvent }) => {
        const button = canvas.getByRole('button', { name: 'Refresh parties' })
        await expect(button).toBeEnabled()

        await userEvent.click(button)
        await expect(args.onSync).toHaveBeenCalledTimes(1)
    },
}

export const SyncNeeded: Story = {
    args: { syncNeeded: true },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(
            canvas.getByRole('button', {
                name: 'Refresh parties (changes available)',
            })
        )
        await expect(args.onSync).toHaveBeenCalledTimes(1)
    },
}

export const Syncing: Story = {
    args: { syncNeeded: true, syncing: true },
    play: async ({ args, canvas }) => {
        // Syncing takes precedence over the "changes available" label
        const button = canvas.getByRole('button', {
            name: 'Syncing parties...',
        })
        await expect(button).toBeDisabled()
        await expect(args.onSync).not.toHaveBeenCalled()
    },
}

export const Disabled: Story = {
    args: { disabled: true },
    play: async ({ args, canvas }) => {
        await expect(
            canvas.getByRole('button', { name: 'Refresh parties' })
        ).toBeDisabled()
        await expect(args.onSync).not.toHaveBeenCalled()
    },
}

export const ShowsTooltip: Story = {
    args: { syncNeeded: true },
    play: async ({ canvas, userEvent }) => {
        // The button is wrapped, so hovering it works even while disabled
        await userEvent.hover(
            canvas.getByRole('button', {
                name: 'Refresh parties (changes available)',
            })
        )
        await expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Refresh parties (changes available)'
        )
    },
}

// What an app does with the presentational component: call the API, report
// the result through a toast and keep the sync state
const SyncContainer = ({ fail = false }: { fail?: boolean }) => {
    const { showToast } = useToast()
    const showError = useErrorToast()
    const [syncNeeded, setSyncNeeded] = useState(true)
    const [syncing, setSyncing] = useState(false)

    const sync = async () => {
        setSyncing(true)
        try {
            await new Promise((resolve) => setTimeout(resolve, 100))
            if (fail) throw new globalThis.Error('sync failed')

            showToast({
                title: 'Wallet Sync Complete',
                message: 'Added: 1, Updated: 1, Disabled: 1.',
                type: 'success',
            })
            setSyncNeeded(false)
        } catch (error) {
            showError(error)
        } finally {
            setSyncing(false)
        }
    }

    return (
        <WalletsSync syncNeeded={syncNeeded} syncing={syncing} onSync={sync} />
    )
}

export const AppFlow: Story = {
    render: () => (
        <ToastProvider>
            <SyncContainer />
        </ToastProvider>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(
            canvas.getByRole('button', {
                name: 'Refresh parties (changes available)',
            })
        )
        await expect(
            canvas.getByRole('button', { name: 'Syncing parties...' })
        ).toBeDisabled()

        // The result is reported through a toast and the button settles
        const toast = await within(canvasElement.ownerDocument.body).findByRole(
            'status'
        )
        await expect(toast).toHaveTextContent('Wallet Sync Complete')
        await expect(toast).toHaveTextContent(
            'Added: 1, Updated: 1, Disabled: 1.'
        )
        await waitFor(() =>
            expect(
                canvas.getByRole('button', { name: 'Refresh parties' })
            ).toBeEnabled()
        )
    },
}

export const AppFlowFailure: Story = {
    render: () => (
        <ToastProvider>
            <SyncContainer fail />
        </ToastProvider>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(
            canvas.getByRole('button', {
                name: 'Refresh parties (changes available)',
            })
        )

        const alert = await within(canvasElement.ownerDocument.body).findByRole(
            'alert'
        )
        await expect(alert).toHaveTextContent('sync failed')
        // Still out of sync, and the button can be used again
        await waitFor(() =>
            expect(
                canvas.getByRole('button', {
                    name: 'Refresh parties (changes available)',
                })
            ).toBeEnabled()
        )
    },
}
