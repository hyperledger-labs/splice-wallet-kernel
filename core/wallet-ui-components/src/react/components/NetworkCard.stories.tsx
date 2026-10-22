// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import type { PublicNetwork } from '@canton-network/core-wallet-user-rpc-client'
import { expect, fn } from 'storybook/test'
import { NetworkCard } from './NetworkCard'

const network: PublicNetwork = {
    id: 'canton:devnet',
    name: 'DevNet',
    description: 'Canton DevNet',
    authMethod: 'authorization_code',
    synchronizerId:
        'global-domain::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a',
    identityProviderId: 'idp-1',
    ledgerApi: 'https://ledger.example',
    clientId: 'client-1',
}

const meta: Meta = {
    title: 'NetworkCard',
    component: NetworkCard,
    args: {
        network,
        onReview: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ args, canvas, userEvent }) => {
        // Hook used by the e2e helpers in wallet-test-utils
        await expect(canvas.getByTestId('network-card')).toBeInTheDocument()
        await expect(canvas.getByText('canton:devnet')).toBeInTheDocument()
        await expect(canvas.getByText('authorization_code')).toBeInTheDocument()
        await expect(canvas.getByText('idp-1')).toBeInTheDocument()
        await expect(
            canvas.getByText(network.synchronizerId!)
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Copy synchronizer ID' })
        ).toBeInTheDocument()

        // Session-only content is hidden
        await expect(canvas.queryByText('CONNECTED')).not.toBeInTheDocument()
        await expect(canvas.queryByText('[private]')).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Copy access token' })
        ).not.toBeInTheDocument()

        await userEvent.click(canvas.getByRole('button', { name: 'DevNet' }))
        await expect(args.onReview).toHaveBeenCalledTimes(1)
        await expect(args.onReview).toHaveBeenCalledWith(network)
    },
}

export const WholeCardIsClickable: Story = {
    play: async ({ canvas, canvasElement }) => {
        const card = canvas.getByRole('article')
        const reviewButton = canvas.getByRole('button', { name: 'DevNet' })
        const copyButton = canvas.getByRole('button', {
            name: 'Copy synchronizer ID',
        })

        // userEvent doesn't hit-test, so check what is actually under the pointer
        const topElementAt = (el: Element, x = 0.5, y = 0.5) => {
            const rect = el.getBoundingClientRect()
            return canvasElement.ownerDocument.elementFromPoint(
                rect.left + rect.width * x,
                rect.top + rect.height * y
            )
        }

        // Clicking the card body lands on the review button's overlay...
        await expect(topElementAt(card, 0.5, 0.9)).toBe(reviewButton)
        // ...but the copy button stays on top of it
        await expect(copyButton.contains(topElementAt(copyButton))).toBe(true)
    },
}

export const ActiveSession: Story = {
    args: { activeSession: true, accessToken: 'secret-token' },
    play: async ({ args, canvas }) => {
        await expect(canvas.getByText('CONNECTED')).toBeInTheDocument()
        await expect(canvas.getByText('Access Token')).toBeInTheDocument()
        // The token itself is never rendered
        await expect(canvas.getByText('[private]')).toBeInTheDocument()
        await expect(canvas.queryByText('secret-token')).not.toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Copy access token' })
        ).toBeInTheDocument()
        await expect(args.onReview).not.toHaveBeenCalled()
    },
}

export const ReadOnly: Story = {
    args: { onReview: undefined },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('DevNet')).toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'DevNet' })
        ).not.toBeInTheDocument()
    },
}

export const Minimal: Story = {
    args: {
        network: {
            ...network,
            synchronizerId: undefined,
            identityProviderId: '',
        },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('canton:devnet')).toBeInTheDocument()
        await expect(canvas.queryByText('Synchronizer')).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Copy synchronizer ID' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByText('Identity provider')
        ).not.toBeInTheDocument()
    },
}
