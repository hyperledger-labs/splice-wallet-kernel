// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, within } from 'storybook/test'
import { ApprovalActions } from './ApprovalActions'

type Props = ComponentProps<typeof ApprovalActions>

// Several states side by side, for stories that only differ in props
const States = ({ states }: { states: Record<string, Partial<Props>> }) => (
    <>
        {Object.entries(states).map(([id, props]) => (
            <div key={id} data-testid={id}>
                <ApprovalActions
                    onApprove={() => {}}
                    onReject={() => {}}
                    {...props}
                />
            </div>
        ))}
    </>
)

const meta: Meta = {
    title: 'ApprovalActions',
    component: ApprovalActions,
    args: {
        onApprove: fn(),
        onReject: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Approve' }))
        await expect(args.onApprove).toHaveBeenCalledTimes(1)
        await userEvent.click(canvas.getByRole('button', { name: 'Reject' }))
        await expect(args.onReject).toHaveBeenCalledTimes(1)
    },
}

export const Variants: Story = {
    render: () => (
        <States
            states={{
                withoutReject: { onReject: undefined },
                retry: { approveLabel: 'Retry submit' },
            }}
        />
    ),
    play: async ({ canvas }) => {
        // Reject is hidden when there is no callback for it
        const withoutReject = within(canvas.getByTestId('withoutReject'))
        await expect(
            withoutReject.getByRole('button', { name: 'Approve' })
        ).toBeEnabled()
        await expect(
            withoutReject.queryByRole('button', { name: 'Reject' })
        ).not.toBeInTheDocument()

        await expect(
            within(canvas.getByTestId('retry')).getByRole('button', {
                name: 'Retry submit',
            })
        ).toBeEnabled()
    },
}

export const BusyStates: Story = {
    render: () => (
        <States
            states={{
                approving: { approving: true },
                signing: { signing: true },
                rejecting: { rejecting: true },
                disabled: { disabled: true },
            }}
        />
    ),
    play: async ({ canvas }) => {
        const state = (id: string) => within(canvas.getByTestId(id))
        const buttons = (id: string) => ({
            approve: state(id).getByRole('button', { name: 'Approve' }),
            reject: state(id).getByRole('button', { name: 'Reject' }),
        })

        await expect(buttons('approving').approve).toBeDisabled()
        await expect(buttons('approving').reject).toBeDisabled()
        // While signing it can still be rejected
        await expect(buttons('signing').approve).toBeDisabled()
        await expect(buttons('signing').reject).toBeEnabled()
        await expect(buttons('rejecting').approve).toBeDisabled()
        await expect(buttons('rejecting').reject).toBeDisabled()
        await expect(buttons('disabled').approve).toBeDisabled()
        await expect(buttons('disabled').reject).toBeDisabled()

        // Progress is shown on the button that is working
        const progress = (id: string) =>
            state(id).queryAllByRole('progressbar', { hidden: true })
        await expect(progress('approving')).toHaveLength(1)
        await expect(progress('signing')).toHaveLength(1)
        await expect(progress('rejecting')).toHaveLength(1)
        await expect(progress('disabled')).toHaveLength(0)
    },
}
