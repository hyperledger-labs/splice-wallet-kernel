// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ApiKey } from '@canton-network/core-wallet-user-rpc-client'
import { ApiKeyCard } from './ApiKeyCard'
import { expect, fn } from 'storybook/test'

const apiKey: ApiKey = {
    name: 'My API Key',
    id: '1234-5678-0000',
    createdAt: '2025-06-01T00:00:00Z',
}

const meta: Meta = {
    title: 'ApiKeyCard',
    component: ApiKeyCard,
    args: {
        apiKey,
        onRevoke: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ args, canvas, userEvent }) => {
        const button = canvas.getByRole('button', { name: 'Revoke' })
        await userEvent.click(button)

        await expect(args.onRevoke).toHaveBeenCalledWith(apiKey)
    },
}
