// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '@mui/material'
import { JsonRpcError } from '@canton-network/core-rpc-errors'
import { expect, waitForElementToBeRemoved, within } from 'storybook/test'
import { useErrorToast, type ErrorToastFallback } from '../hooks/useErrorToast'
import { useToast } from '../hooks/useToast'
import { ToastProvider } from './ToastProvider'
import type { ToastOptions } from './ToastContext'

const ShowToast = (options: ToastOptions) => {
    const { showToast } = useToast()
    return <Button onClick={() => showToast(options)}>Show toast</Button>
}

const ShowErrorToast = ({
    error,
    fallback,
}: {
    error: unknown
    fallback?: ErrorToastFallback
}) => {
    const showError = useErrorToast()
    return <Button onClick={() => showError(error, fallback)}>Fail</Button>
}

const meta: Meta = {
    title: 'ToastProvider',
    component: ToastProvider,
}

export default meta

type Story = StoryObj<typeof meta>

// Toasts render at the fixed corner of the page, so query the whole document
const body = (canvasElement: HTMLElement) =>
    within(canvasElement.ownerDocument.body)

export const Error: Story = {
    render: (args) => (
        <ToastProvider {...args}>
            <ShowToast
                type="error"
                title="Something went wrong"
                message="Could not complete the transaction."
            />
        </ToastProvider>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
        await expect(
            body(canvasElement).queryByRole('alert')
        ).not.toBeInTheDocument()

        await userEvent.click(
            canvas.getByRole('button', { name: 'Show toast' })
        )

        const alert = await body(canvasElement).findByRole('alert')
        await expect(alert).toHaveTextContent('Something went wrong')
        await expect(alert).toHaveTextContent(
            'Could not complete the transaction.'
        )
    },
}

export const Success: Story = {
    render: (args) => (
        <ToastProvider {...args}>
            <ShowToast
                type="success"
                title="Wallet sync complete"
                message="4 added, 2 updated, 2 disabled."
                buttonText="Close notification"
            />
        </ToastProvider>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(
            canvas.getByRole('button', { name: 'Show toast' })
        )

        const status = await body(canvasElement).findByRole('status')
        await expect(status).toHaveTextContent('Wallet sync complete')
        await expect(
            within(status).getByRole('button', { name: 'Close notification' })
        ).toBeInTheDocument()
    },
}

export const DefaultsToError: Story = {
    render: (args) => (
        <ToastProvider {...args}>
            <ShowToast title="Oops" message="No type given." />
        </ToastProvider>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(
            canvas.getByRole('button', { name: 'Show toast' })
        )

        await expect(
            await body(canvasElement).findByRole('alert')
        ).toHaveTextContent('Oops')
    },
}

export const DismissedByButton: Story = {
    render: (args) => (
        <ToastProvider {...args}>
            <ShowToast type="info" title="Heads up" message="Dismiss me." />
        </ToastProvider>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(
            canvas.getByRole('button', { name: 'Show toast' })
        )
        const status = await body(canvasElement).findByRole('status')

        await userEvent.click(
            within(status).getByRole('button', { name: 'Dismiss notification' })
        )
        await waitForElementToBeRemoved(status)
    },
}

export const DismissedAutomatically: Story = {
    args: { autoHideDuration: 200 },
    render: (args) => (
        <ToastProvider {...args}>
            <ShowToast type="info" title="Heads up" message="Going away." />
        </ToastProvider>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(
            canvas.getByRole('button', { name: 'Show toast' })
        )
        const status = await body(canvasElement).findByRole('status')

        await waitForElementToBeRemoved(status)
    },
}

export const MultipleToasts: Story = {
    render: (args) => (
        <ToastProvider {...args}>
            <ShowToast type="error" title="First" message="One." />
            <ShowToast type="success" title="Second" message="Two." />
        </ToastProvider>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
        const [showFirst, showSecond] = canvas.getAllByRole('button', {
            name: 'Show toast',
        })
        await userEvent.click(showFirst!)
        await userEvent.click(showSecond!)

        // Both stay visible instead of overlapping or replacing each other
        const alert = await body(canvasElement).findByRole('alert')
        const status = await body(canvasElement).findByRole('status')
        await expect(alert).toHaveTextContent('First')
        await expect(status).toHaveTextContent('Second')

        // Dismissing one leaves the other
        await userEvent.click(
            within(alert).getByRole('button', { name: 'Dismiss notification' })
        )
        await waitForElementToBeRemoved(alert)
        await expect(
            body(canvasElement).getByRole('status')
        ).toBeInTheDocument()
    },
}

export const ErrorToastFromError: Story = {
    render: (args) => (
        <ToastProvider {...args}>
            <ShowErrorToast error={new globalThis.Error('boom')} />
        </ToastProvider>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Fail' }))

        const alert = await body(canvasElement).findByRole('alert')
        await expect(alert).toHaveTextContent('Unexpected Error')
        await expect(alert).toHaveTextContent('boom')
        await expect(
            within(alert).getByRole('button', { name: 'Dismiss' })
        ).toBeInTheDocument()
    },
}

export const ErrorToastFromJsonRpcError: Story = {
    render: (args) => (
        <ToastProvider {...args}>
            <ShowErrorToast error={new JsonRpcError(-32602, 'bad params')} />
        </ToastProvider>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Fail' }))

        // The JSON-RPC code is mapped to a readable title
        const alert = await body(canvasElement).findByRole('alert')
        await expect(alert).toHaveTextContent('Invalid Parameters')
        await expect(alert).toHaveTextContent('bad params')
    },
}

export const ErrorToastWithFallback: Story = {
    render: (args) => (
        <ToastProvider {...args}>
            <ShowErrorToast
                error={{}}
                fallback={{
                    title: 'Could not load parties',
                    message: 'Please refresh and try again.',
                    buttonText: 'Close',
                }}
            />
        </ToastProvider>
    ),
    play: async ({ canvas, canvasElement, userEvent }) => {
        await userEvent.click(canvas.getByRole('button', { name: 'Fail' }))

        // Used when the thrown value carries no message of its own
        const alert = await body(canvasElement).findByRole('alert')
        await expect(alert).toHaveTextContent('Could not load parties')
        await expect(alert).toHaveTextContent('Please refresh and try again.')
        await expect(
            within(alert).getByRole('button', { name: 'Close' })
        ).toBeInTheDocument()
    },
}
