// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Network } from '@canton-network/core-wallet-user-rpc-client'
import { Button } from '@mui/material'
import { expect, fn, within } from 'storybook/test'
import { fillField } from '../__tests__/fields'
import { NetworkForm } from './NetworkForm'

const network: Network = {
    id: 'canton:devnet',
    name: 'DevNet',
    description: 'Canton DevNet',
    identityProviderId: 'idp-1',
    ledgerApi: 'http://localhost:6865',
    auth: {
        method: 'authorization_code',
        audience: 'aud',
        scope: 'scope',
        clientId: 'client-id',
    },
}

const clientCredentialsAuth = {
    method: 'client_credentials',
    audience: 'admin-aud',
    scope: 'admin-scope',
    clientId: 'admin-client',
    clientSecret: 'admin-secret',
} as const

const meta: Meta = {
    title: 'NetworkForm',
    component: NetworkForm,
    args: {
        onSave: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

// The optional auth editors have "Add" buttons of their own, so the form's
// submit button is found by the hook the e2e helpers use
const addButton = (canvasElement: HTMLElement) =>
    canvasElement.querySelector<HTMLElement>(
        '[data-test-id="add-network-button"]'
    )

// Each auth editor sits in its own labelled section
const section = (canvas: ReturnType<typeof within>, name: string) =>
    within(canvas.getByRole('region', { name }))

export const Add: Story = {
    play: async ({ args, canvas, canvasElement, userEvent }) => {
        await expect(
            canvas.queryByRole('button', { name: 'Update' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('heading', { name: 'Delete network' })
        ).not.toBeInTheDocument()

        const text = async (name: RegExp, value: string) =>
            fillField(userEvent, canvas.getByRole('textbox', { name }), value)
        await text(/^Network Id/, 'new-net')
        await text(/^Name/, 'New Network')
        await text(/^Description/, 'A new network')
        await text(/^Identity Provider Id/, 'idp-1')
        await text(/^Ledger API Base Url/, 'http://localhost:6865')
        // The user auth is a required editor, shown straight away
        const userAuth = section(canvas, 'Configure user auth')
        const authText = async (name: RegExp, value: string) =>
            fillField(userEvent, userAuth.getByRole('textbox', { name }), value)
        await authText(/^Client Id/, 'client')
        await authText(/^Audience/, 'aud')
        await authText(/^Scope/, 'scope')

        await userEvent.click(addButton(canvasElement)!)

        // No synchronizer ID, admin auth or service account auth were entered
        await expect(args.onSave).toHaveBeenCalledTimes(1)
        await expect(args.onSave).toHaveBeenCalledWith({
            id: 'new-net',
            name: 'New Network',
            description: 'A new network',
            identityProviderId: 'idp-1',
            ledgerApi: 'http://localhost:6865',
            auth: {
                method: 'authorization_code',
                clientId: 'client',
                audience: 'aud',
                scope: 'scope',
            },
        })
    },
}

export const Review: Story = {
    args: { network, onDelete: fn(), onCancel: fn() },
    play: async ({ args, canvas, canvasElement, userEvent }) => {
        await expect(
            canvas.getByRole('textbox', { name: /^Network Id/ })
        ).toHaveValue('canton:devnet')
        // Review mode has no submit button for adding
        await expect(addButton(canvasElement)).toBeNull()

        const name = canvas.getByRole('textbox', { name: /^Name/ })
        await fillField(userEvent, name, 'Updated Name')
        await userEvent.click(canvas.getByRole('button', { name: 'Update' }))
        await expect(args.onSave).toHaveBeenCalledWith({
            ...network,
            name: 'Updated Name',
        })

        await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }))
        await expect(args.onCancel).toHaveBeenCalledTimes(1)

        // Delete reports the network as passed in, not the edited one
        await expect(
            canvas.getByRole('heading', { name: 'Delete network' })
        ).toBeInTheDocument()
        await userEvent.click(
            canvas.getByRole('button', { name: 'Delete Network' })
        )
        await expect(args.onDelete).toHaveBeenCalledTimes(1)
        await expect(args.onDelete).toHaveBeenCalledWith(network)
    },
}

export const ReviewWithoutDeleteOrCancel: Story = {
    args: { network },
    play: async ({ canvas }) => {
        // Actions whose callback is omitted are hidden
        await expect(
            canvas.queryByRole('heading', { name: 'Delete network' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Delete Network' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Cancel' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Update' })
        ).toBeInTheDocument()
    },
}

export const AddIgnoresReviewActions: Story = {
    // Without a network it is an add, even if review callbacks are passed
    args: { onDelete: fn(), onCancel: fn() },
    play: async ({ canvas, canvasElement }) => {
        await expect(addButton(canvasElement)).not.toBeNull()
        await expect(
            canvas.queryByRole('button', { name: 'Cancel' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('heading', { name: 'Delete network' })
        ).not.toBeInTheDocument()
    },
}

export const RequiresFields: Story = {
    play: async ({ args, canvas, canvasElement, userEvent }) => {
        // The browser blocks submitting empty required fields
        await userEvent.click(addButton(canvasElement)!)

        await expect(args.onSave).not.toHaveBeenCalled()
        await expect(
            canvas.getByRole('textbox', { name: /^Network Id/ })
        ).toBeInvalid()
    },
}

export const ValidatesWhenBrowserValidationIsBypassed: Story = {
    play: async ({ args, canvas, canvasElement }) => {
        // e.g. a programmatic submit: the form checks the network itself too
        canvasElement
            .querySelector('form')!
            .dispatchEvent(
                new Event('submit', { bubbles: true, cancelable: true })
            )

        await expect(await canvas.findByRole('alert')).toHaveTextContent(
            'Invalid network data, please ensure all fields are set correctly'
        )
        await expect(args.onSave).not.toHaveBeenCalled()
    },
}

export const InvalidLedgerApi: Story = {
    args: { network },
    play: async ({ args, canvas, userEvent }) => {
        const ledgerApi = canvas.getByRole('textbox', {
            name: /^Ledger API Base Url/,
        })
        await fillField(userEvent, ledgerApi, 'not a url')
        await userEvent.click(canvas.getByRole('button', { name: 'Update' }))

        await expect(args.onSave).not.toHaveBeenCalled()
        await expect(await canvas.findByRole('alert')).toHaveTextContent(
            'Invalid network data'
        )
        await expect(
            canvas.getByText('Must be a valid URL')
        ).toBeInTheDocument()
        await expect(ledgerApi).toBeInvalid()

        // Fixing it clears the error and saves
        await fillField(userEvent, ledgerApi, 'https://ledger.example')
        await expect(canvas.queryByRole('alert')).not.toBeInTheDocument()
        await userEvent.click(canvas.getByRole('button', { name: 'Update' }))
        await expect(args.onSave).toHaveBeenCalledWith({
            ...network,
            ledgerApi: 'https://ledger.example',
        })
    },
}

export const SynchronizerId: Story = {
    args: { network },
    play: async ({ args, canvas, userEvent }) => {
        const synchronizerId = canvas.getByRole('textbox', {
            name: /^Synchronizer Id/,
        })
        await expect(synchronizerId).not.toBeRequired()

        // It has to look like a synchronizer ID when it is set
        await fillField(userEvent, synchronizerId, 'short')
        await userEvent.click(canvas.getByRole('button', { name: 'Update' }))
        await expect(args.onSave).not.toHaveBeenCalled()
        await expect(
            canvas.getByText('Must contain "::" and be at least 10 characters')
        ).toBeInTheDocument()

        await fillField(userEvent, synchronizerId, 'global-domain::1220abcd')
        await userEvent.click(canvas.getByRole('button', { name: 'Update' }))
        await expect(args.onSave).toHaveBeenLastCalledWith({
            ...network,
            synchronizerId: 'global-domain::1220abcd',
        })

        // Emptying it leaves it out of the network again
        await fillField(userEvent, synchronizerId, '')
        await userEvent.click(canvas.getByRole('button', { name: 'Update' }))
        await expect(args.onSave).toHaveBeenLastCalledWith(network)
    },
}

export const UserAuthMethods: Story = {
    args: {
        network: { ...network, auth: { ...clientCredentialsAuth } },
    },
    play: async ({ canvas, userEvent }) => {
        const userAuth = section(canvas, 'Configure user auth')
        await expect(
            userAuth.getByLabelText(/^Client Secret/)
        ).toBeInTheDocument()

        const method = userAuth.getByRole('combobox', { name: /^Method/ })
        await userEvent.selectOptions(method, 'authorization_code')
        await expect(
            userAuth.queryByLabelText(/^Client Secret/)
        ).not.toBeInTheDocument()

        await userEvent.selectOptions(method, 'client_credentials')
        await expect(
            userAuth.getByLabelText(/^Client Secret/)
        ).toBeInTheDocument()
    },
}

export const AddingAdminAuth: Story = {
    args: { network },
    play: async ({ args, canvas, userEvent }) => {
        const admin = section(canvas, 'Configure admin auth')
        await expect(
            admin.getByText('No admin auth configured.')
        ).toBeInTheDocument()

        await userEvent.click(admin.getByRole('button', { name: 'Add' }))
        await userEvent.selectOptions(
            admin.getByRole('combobox', { name: /^Method/ }),
            'client_credentials'
        )
        await fillField(
            userEvent,
            admin.getByRole('textbox', { name: /^Client Id/ }),
            'admin-client'
        )
        await fillField(
            userEvent,
            admin.getByRole('textbox', { name: /^Audience/ }),
            'admin-aud'
        )
        await fillField(
            userEvent,
            admin.getByRole('textbox', { name: /^Scope/ }),
            'admin-scope'
        )
        await fillField(
            userEvent,
            admin.getByLabelText(/^Client Secret/),
            'admin-secret'
        )

        await userEvent.click(canvas.getByRole('button', { name: 'Update' }))
        await expect(args.onSave).toHaveBeenCalledWith({
            ...network,
            adminAuth: {
                method: 'client_credentials',
                clientId: 'admin-client',
                audience: 'admin-aud',
                scope: 'admin-scope',
                clientSecret: 'admin-secret',
            },
        })
    },
}

export const RemovingAdminAuth: Story = {
    args: {
        network: { ...network, adminAuth: { ...clientCredentialsAuth } },
    },
    play: async ({ args, canvas, userEvent }) => {
        const admin = section(canvas, 'Configure admin auth')
        await expect(admin.getByText('admin-client')).toBeInTheDocument()

        await userEvent.click(admin.getByRole('button', { name: 'Remove' }))
        await expect(
            admin.getByText(
                'Admin auth will be removed after submitting this form.'
            )
        ).toBeInTheDocument()

        // Removed from the saved network, not just hidden
        await userEvent.click(canvas.getByRole('button', { name: 'Update' }))
        await expect(args.onSave).toHaveBeenCalledWith(network)
    },
}

export const RestoringRemovedAdminAuth: Story = {
    args: {
        network: { ...network, adminAuth: { ...clientCredentialsAuth } },
    },
    play: async ({ args, canvas, userEvent }) => {
        const admin = section(canvas, 'Configure admin auth')
        await userEvent.click(admin.getByRole('button', { name: 'Remove' }))
        await userEvent.click(admin.getByRole('button', { name: 'Cancel' }))

        await userEvent.click(canvas.getByRole('button', { name: 'Update' }))
        await expect(args.onSave).toHaveBeenCalledWith({
            ...network,
            adminAuth: clientCredentialsAuth,
        })
    },
}

export const ServiceAccountAuthIsClientCredentialsOnly: Story = {
    args: { network },
    play: async ({ canvas, userEvent }) => {
        const serviceAccount = section(canvas, 'Configure service account auth')
        await expect(
            serviceAccount.getByText('No service account auth configured.')
        ).toBeInTheDocument()

        await userEvent.click(
            serviceAccount.getByRole('button', { name: 'Add' })
        )
        const method = serviceAccount.getByRole('combobox', { name: /^Method/ })
        await expect(method).toHaveValue('client_credentials')
        await expect(serviceAccount.getAllByRole('option')).toHaveLength(1)
    },
}

export const StartsOverWhenNetworkChanges: Story = {
    render: (args) => {
        const [current, setCurrent] = useState<Network>(network)
        return (
            <>
                <NetworkForm network={current} onSave={args.onSave} />
                <Button
                    onClick={() =>
                        setCurrent({
                            ...network,
                            id: 'other',
                            name: 'Other',
                            adminAuth: { ...clientCredentialsAuth },
                        })
                    }
                >
                    Show other
                </Button>
            </>
        )
    },
    play: async ({ canvas, userEvent }) => {
        await userEvent.type(
            canvas.getByRole('textbox', { name: /^Name/ }),
            ' edited'
        )
        await expect(
            canvas.getByRole('textbox', { name: /^Name/ })
        ).toHaveValue('DevNet edited')

        await userEvent.click(
            canvas.getByRole('button', { name: 'Show other' })
        )

        // The fields, and the auth editors' own state, follow the new network
        await expect(
            canvas.getByRole('textbox', { name: /^Name/ })
        ).toHaveValue('Other')
        await expect(
            section(canvas, 'Configure admin auth').getByText('admin-client')
        ).toBeInTheDocument()
    },
}

export const ExposesE2eHooks: Story = {
    play: async ({ canvasElement, canvas }) => {
        // The helpers in wallet-test-utils click the submit button by this attribute
        await expect(
            canvasElement.querySelector('[data-test-id="add-network-button"]')
                ?.tagName
        ).toBe('BUTTON')
        // ...and find the fields by their labels
        for (const label of [
            'Network Id',
            'Name',
            'Description',
            'Synchronizer Id',
            'Identity Provider Id',
            'Ledger API Base Url',
        ]) {
            await expect(
                canvas.getAllByLabelText(new RegExp(`^${label}`))[0]
            ).toBeInTheDocument()
        }
        // ...and the user auth inputs by data-test-id
        await expect(
            canvasElement.querySelector(
                '[data-test-id="auth-editor-client-id-input"]'
            )
        ).not.toBeNull()
    },
}

export const ExposesUpdateHook: Story = {
    args: { network },
    play: async ({ canvasElement }) => {
        await expect(
            canvasElement.querySelector(
                '[data-test-id="update-network-button"]'
            )?.tagName
        ).toBe('BUTTON')
    },
}
