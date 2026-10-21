// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { ComponentProps } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ParsedTransactionInfo } from '@canton-network/core-tx-visualizer'
import { expect, fn, within } from 'storybook/test'
import { TransactionDetail } from './TransactionDetail'

const parsed: ParsedTransactionInfo = {
    isCreate: false,
    isExercise: true,
    choiceId: 'TransferPreapproval_Send',
    templateId: 'pkg:Module:Entity',
    signatories: ['alice::1220aa', 'bob::1220bb'],
    jsonString: '{"a":1}',
}

type Props = ComponentProps<typeof TransactionDetail>

const base: Props = {
    commandId: 'cmd-1',
    status: 'pending',
    txHash: 'hash-abc',
    parsed,
    createdAt: '2025-06-01T12:34:56Z',
    onApprove: () => {},
    onReject: () => {},
}

// Several states side by side, for stories that only differ in props
const States = ({ states }: { states: Record<string, Partial<Props>> }) => (
    <>
        {Object.entries(states).map(([id, props]) => (
            <div key={id} data-testid={id}>
                <TransactionDetail {...base} {...props} />
            </div>
        ))}
    </>
)

const meta: Meta = {
    title: 'TransactionDetail',
    component: TransactionDetail,
    args: {
        ...base,
        externalTxId: 'ext-tx-1',
        onApprove: fn(),
        onReject: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Pending: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await expect(
            canvas.getByRole('heading', { name: 'Activity Details' })
        ).toBeInTheDocument()
        await expect(canvas.getByTestId('activity-status')).toHaveTextContent(
            'pending'
        )
        await expect(
            canvas.getByText('TransferPreapproval_Send')
        ).toBeInTheDocument()
        await expect(canvas.getByText('2025-06-01 12:34')).toBeInTheDocument()
        await expect(canvas.getByText('alice::1220aa')).toBeInTheDocument()
        await expect(canvas.getByText('pkg:Module:Entity')).toBeInTheDocument()
        await expect(canvas.getByText('ext-tx-1')).toBeInTheDocument()
        await expect(canvas.getByText('hash-abc')).toBeInTheDocument()
        await expect(
            canvas.queryByRole('link', { name: 'Back' })
        ).not.toBeInTheDocument()

        // Everything with a value can be copied
        for (const name of [
            'Copy template',
            'Copy command ID',
            'Copy external transaction ID',
            'Copy transaction hash',
            'Copy transaction json object',
        ]) {
            await expect(
                canvas.getByRole('button', { name })
            ).toBeInTheDocument()
        }
        await expect(
            canvas.getAllByRole('button', { name: 'Copy signatory' })
        ).toHaveLength(2)

        // The JSON is only in the page while expanded
        const toggle = canvas.getByRole('button', {
            name: 'Transaction JSON Object',
        })
        await expect(toggle).toHaveAttribute('aria-expanded', 'false')
        await expect(canvas.queryByText('{"a":1}')).not.toBeInTheDocument()
        await userEvent.click(toggle)
        await expect(toggle).toHaveAttribute('aria-expanded', 'true')
        await expect(canvas.getByText('{"a":1}')).toBeInTheDocument()

        await userEvent.click(canvas.getByRole('button', { name: 'Approve' }))
        await expect(args.onApprove).toHaveBeenCalledTimes(1)
        await expect(args.onApprove).toHaveBeenCalledWith('cmd-1')
        await userEvent.click(canvas.getByRole('button', { name: 'Reject' }))
        await expect(args.onReject).toHaveBeenCalledTimes(1)
        await expect(args.onReject).toHaveBeenCalledWith('cmd-1')
    },
}

export const WithBackLink: Story = {
    args: { backHref: '/activities/' },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('link', { name: 'Back' })
        ).toHaveAttribute('href', '/activities/')
    },
}

export const WithoutRejectCallback: Story = {
    args: { onReject: undefined },
    play: async ({ canvas }) => {
        await expect(
            canvas.queryByRole('button', { name: 'Reject' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Approve' })
        ).toBeEnabled()
    },
}

export const SignedStates: Story = {
    render: () => (
        <States
            states={{
                signed: { status: 'signed' },
                failed: { status: 'signed', submitFailed: true },
                retrying: {
                    status: 'signed',
                    submitFailed: true,
                    approving: true,
                },
                firstSubmit: { status: 'signed', approving: true },
            }}
        />
    ),
    play: async ({ canvas }) => {
        const state = (id: string) => within(canvas.getByTestId(id))

        // A signed transaction can only be approved, not rejected
        await expect(
            state('signed').queryByRole('button', { name: 'Reject' })
        ).not.toBeInTheDocument()
        await expect(
            state('signed').getByRole('button', { name: 'Approve' })
        ).toBeEnabled()

        // After a failed submit it is a retry, which stays that while it runs
        await expect(
            state('failed').getByRole('button', { name: 'Retry submit' })
        ).toBeEnabled()
        await expect(
            state('retrying').getByRole('button', { name: 'Retry submit' })
        ).toBeDisabled()
        // ...but the first submit of a signed transaction is still "Approve"
        await expect(
            state('firstSubmit').getByRole('button', { name: 'Approve' })
        ).toBeDisabled()
    },
}

export const WithoutActions: Story = {
    render: () => (
        <States
            states={{
                executed: { status: 'executed' },
                failed: { status: 'failed' },
                unknown: { status: '' },
            }}
        />
    ),
    play: async ({ canvas }) => {
        // Only pending and signed transactions have actions
        await expect(
            canvas.queryByRole('button', { name: 'Approve' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Reject' })
        ).not.toBeInTheDocument()

        // The status is coloured by tone, with a fallback label
        const badge = (id: string) =>
            within(canvas.getByTestId(id)).getByTestId('activity-status')
        await expect(badge('executed')).toHaveClass(/MuiChip-colorSuccess/)
        await expect(badge('failed')).toHaveClass(/MuiChip-colorError/)
        await expect(badge('unknown')).toHaveTextContent('Unknown')
    },
}

export const MissingData: Story = {
    args: {
        externalTxId: null,
        txHash: '',
        parsed: null,
        createdAt: null,
    },
    play: async ({ canvas, userEvent }) => {
        // Four rows have nothing to show: action type, created at, signatories, template
        // ...and the transaction hash
        await expect(canvas.getAllByText('N/A')).toHaveLength(5)
        await expect(
            canvas.queryByText('External transaction ID')
        ).not.toBeInTheDocument()

        // Only the command ID can be copied
        await expect(
            canvas.getAllByRole('button', { name: /^Copy/ })
        ).toHaveLength(1)
        await expect(
            canvas.getByRole('button', { name: 'Copy command ID' })
        ).toBeInTheDocument()

        await userEvent.click(
            canvas.getByRole('button', { name: 'Transaction JSON Object' })
        )
        await expect(canvas.getAllByText('N/A')).toHaveLength(6)
    },
}
