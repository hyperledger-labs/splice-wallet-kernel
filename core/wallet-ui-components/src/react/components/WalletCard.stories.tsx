// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Wallet } from '@canton-network/core-wallet-user-rpc-client'
import { expect, fn } from 'storybook/test'
import { WalletCard } from './WalletCard'

const partyId =
    'alice::1220be58c29e65de40bf273be1dc2b266d43a9a002ea5b18955aeef7aac881bb471a'

const wallet: Wallet = {
    primary: false,
    status: 'allocated',
    partyId,
    hint: 'alice',
    publicKey: 'public-key',
    namespace: '1220be58',
    networkId: 'canton:devnet',
    signingProviderId: 'wallet-kernel',
    rights: [],
}

const meta: Meta = {
    title: 'WalletCard',
    component: WalletCard,
    args: {
        wallet,
        onAllocate: fn(),
        onSetPrimary: fn(),
        onEdit: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Unallocated: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await expect(canvas.getByText('alice')).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Copy party hint' })
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Copy party ID' })
        ).toBeInTheDocument()
        await expect(canvas.getByText('wallet-kernel')).toBeInTheDocument()

        // Verified-only actions are hidden
        await expect(
            canvas.queryByRole('button', { name: 'Set as primary' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Edit' })
        ).not.toBeInTheDocument()

        await userEvent.click(
            canvas.getByRole('button', { name: 'Allocate party' })
        )
        await expect(args.onAllocate).toHaveBeenCalledTimes(1)
        await expect(args.onAllocate).toHaveBeenCalledWith(wallet)
    },
}

export const ExposesE2eHooks: Story = {
    args: {
        wallet: { ...wallet, externalTxId: 'tx-123' },
    },
    play: async ({ canvas, canvasElement }) => {
        // Used by the helpers in wallet-test-utils to find a card and read its party
        const card = canvas.getByTestId('wallet-card')
        await expect(card).toHaveAttribute('party-id', partyId)
        await expect(
            canvasElement.querySelector('[data-test-external-tx-id]')
        ).toHaveAttribute('data-test-external-tx-id', 'tx-123')
    },
}

export const UnallocatedLoading: Story = {
    args: { loading: true },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: 'Allocate party' })
        ).toBeDisabled()
    },
}

export const UnallocatedDisabled: Story = {
    args: {
        wallet: { ...wallet, disabled: true, reason: 'Key not available' },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Disabled')).toBeInTheDocument()
        await expect(canvas.getByText('Key not available')).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Allocate party' })
        ).toBeDisabled()
    },
}

export const Verified: Story = {
    args: { verified: true },
    play: async ({ args, canvas, userEvent }) => {
        await expect(canvas.queryByText('PRIMARY')).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Allocate party' })
        ).not.toBeInTheDocument()

        await userEvent.click(
            canvas.getByRole('button', { name: 'Set as primary' })
        )
        await expect(args.onSetPrimary).toHaveBeenCalledTimes(1)
        await expect(args.onSetPrimary).toHaveBeenCalledWith(wallet)

        await userEvent.click(canvas.getByRole('button', { name: 'Edit' }))
        await expect(args.onEdit).toHaveBeenCalledTimes(1)
        await expect(args.onEdit).toHaveBeenCalledWith(wallet)
    },
}

export const VerifiedLoading: Story = {
    args: { verified: true, loading: true },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: 'Set as primary' })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('button', { name: 'Edit' })
        ).toBeDisabled()
    },
}

export const Primary: Story = {
    args: { verified: true, wallet: { ...wallet, primary: true } },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('PRIMARY')).toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Set as primary' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Edit' })
        ).toBeInTheDocument()
    },
}

export const VerifiedDisabled: Story = {
    args: { verified: true, wallet: { ...wallet, disabled: true } },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Disabled')).toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Set as primary' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Edit' })
        ).toBeInTheDocument()
    },
}

export const VerifiedReadOnly: Story = {
    args: { verified: true, onSetPrimary: undefined, onEdit: undefined },
    play: async ({ canvas }) => {
        // Actions whose callback is omitted are hidden
        await expect(
            canvas.queryByRole('button', { name: 'Set as primary' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Edit' })
        ).not.toBeInTheDocument()
    },
}

export const Select: Story = {
    args: {
        verified: true,
        wallet: { ...wallet, primary: true },
        onSelect: fn(),
    },
    play: async ({ args, canvas, userEvent }) => {
        // Replaces the badge and every other action
        await expect(canvas.queryByText('PRIMARY')).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Edit' })
        ).not.toBeInTheDocument()

        await userEvent.click(canvas.getByRole('button', { name: 'Select' }))
        await expect(args.onSelect).toHaveBeenCalledTimes(1)
        await expect(args.onSelect).toHaveBeenCalledWith({
            ...wallet,
            primary: true,
        })
    },
}

export const SelectWithCustomLabel: Story = {
    args: { onSelect: fn(), selectLabel: 'Use this party', loading: true },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: 'Use this party' })
        ).toBeDisabled()
    },
}

export const LongPartyId: Story = {
    play: async ({ canvas }) => {
        const shown = `${partyId.slice(0, 10)}...${partyId.slice(-10)}`
        // Shortened, with the full ID on hover
        await expect(canvas.getByText(shown)).toHaveAttribute('title', partyId)
        await expect(canvas.queryByText(partyId)).not.toBeInTheDocument()
    },
}

export const ShortPartyId: Story = {
    args: { wallet: { ...wallet, partyId: 'alice::1220' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('alice::1220')).toBeInTheDocument()
    },
}

export const NoHint: Story = {
    args: { wallet: { ...wallet, hint: '' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('-')).toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Copy party hint' })
        ).not.toBeInTheDocument()
    },
}

export const WithPermissions: Story = {
    args: {
        verified: true,
        wallet: {
            ...wallet,
            // Listed out of order: shown in a fixed order, only those held
            rights: ['CanReadAs', 'CanActAs'],
        },
    },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Permissions')).toBeInTheDocument()
        const chips = ['CanActAs', 'CanReadAs'].map((name) =>
            canvas.getByText(name)
        )
        await expect(chips[0]).toBeInTheDocument()
        await expect(
            chips[0].compareDocumentPosition(chips[1]) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy()
        await expect(canvas.queryByText('CanExecuteAs')).not.toBeInTheDocument()
    },
}

export const NoPermissions: Story = {
    play: async ({ canvas }) => {
        await expect(canvas.queryByText('Permissions')).not.toBeInTheDocument()
    },
}

export const ShortReason: Story = {
    args: { wallet: { ...wallet, disabled: true, reason: 'Key revoked' } },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('Reason')).toBeInTheDocument()
        await expect(canvas.getByText('Key revoked')).toBeInTheDocument()
    },
}

const longReason =
    'The signing provider rejected the allocation request because the topology transaction could not be authorised by the configured key.'

export const LongReason: Story = {
    args: { wallet: { ...wallet, disabled: true, reason: longReason } },
    play: async ({ canvas }) => {
        // Long reasons wrap in full instead of being truncated
        const reason = canvas.getByText(longReason)
        await expect(reason).toBeInTheDocument()
        await expect(reason.scrollWidth).toBeLessThanOrEqual(reason.clientWidth)
    },
}
