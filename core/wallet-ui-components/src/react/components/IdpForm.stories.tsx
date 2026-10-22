// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { Idp } from '@canton-network/core-wallet-user-rpc-client'
import { Button } from '@mui/material'
import { expect, fn } from 'storybook/test'
import { fillField } from '../__tests__/fields'
import { IdpForm } from './IdpForm'

const oauthIdp: Idp = {
    id: 'my-idp',
    type: 'oauth',
    issuer: 'https://old-issuer.example',
    configUrl: 'https://old-issuer.example/.well-known',
}
const selfIssuedIdp: Idp = { id: 'self-issued-idp', type: 'self_issued' }

const meta: Meta = {
    title: 'IdpForm',
    component: IdpForm,
    args: {
        onSave: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Add: Story = {
    play: async ({ args, canvas, userEvent }) => {
        // OAuth is the default type, so all three text fields are shown
        await expect(
            canvas.getByRole('combobox', { name: /^Type/ })
        ).toHaveValue('oauth')
        await expect(
            canvas.getByText('A unique identifier for the identity provider')
        ).toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Update' })
        ).not.toBeInTheDocument()
        await expect(canvas.queryByText('Cancel')).not.toBeInTheDocument()

        await fillField(
            userEvent,
            canvas.getByRole('textbox', { name: /^ID/ }),
            'new-idp'
        )
        await fillField(
            userEvent,
            canvas.getByRole('textbox', { name: /^Issuer URL/ }),
            'https://issuer.example'
        )
        await fillField(
            userEvent,
            canvas.getByRole('textbox', { name: /^Config URL/ }),
            'https://issuer.example/.well-known'
        )
        await userEvent.click(canvas.getByRole('button', { name: 'Add' }))

        await expect(args.onSave).toHaveBeenCalledTimes(1)
        await expect(args.onSave).toHaveBeenCalledWith({
            id: 'new-idp',
            type: 'oauth',
            issuer: 'https://issuer.example',
            configUrl: 'https://issuer.example/.well-known',
        })
    },
}

export const AddIgnoresReviewActions: Story = {
    // Without an identity provider it is an add, even if review callbacks are passed
    args: { onDelete: fn(), onCancel: fn() },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('button', { name: 'Add' })
        ).toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Cancel' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('heading', { name: 'Delete identity provider' })
        ).not.toBeInTheDocument()
    },
}

export const AddSelfSigned: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Type/ }),
            'self_signed'
        )

        // No config URL for self-signed identity providers
        await expect(
            canvas.queryByRole('textbox', { name: /^Config URL/ })
        ).not.toBeInTheDocument()

        await userEvent.type(
            canvas.getByRole('textbox', { name: /^ID/ }),
            'self-signed-idp'
        )
        await userEvent.type(
            canvas.getByRole('textbox', { name: /^Issuer URL/ }),
            'https://issuer.example'
        )
        await userEvent.click(canvas.getByRole('button', { name: 'Add' }))

        await expect(args.onSave).toHaveBeenCalledWith({
            id: 'self-signed-idp',
            type: 'self_signed',
            issuer: 'https://issuer.example',
        })
    },
}

export const AddSelfIssued: Story = {
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.selectOptions(
            canvas.getByRole('combobox', { name: /^Type/ }),
            'self_issued'
        )

        // Only the ID is needed
        await expect(
            canvas.queryByRole('textbox', { name: /^Issuer URL/ })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('textbox', { name: /^Config URL/ })
        ).not.toBeInTheDocument()

        await userEvent.type(
            canvas.getByRole('textbox', { name: /^ID/ }),
            'self-issued-idp{Enter}'
        )
        await expect(args.onSave).toHaveBeenCalledWith({
            id: 'self-issued-idp',
            type: 'self_issued',
        })
    },
}

export const KeepsDraftsWhenTypeChanges: Story = {
    play: async ({ args, canvas, userEvent }) => {
        const type = canvas.getByRole('combobox', { name: /^Type/ })
        await fillField(
            userEvent,
            canvas.getByRole('textbox', { name: /^ID/ }),
            'idp'
        )
        await fillField(
            userEvent,
            canvas.getByRole('textbox', { name: /^Issuer URL/ }),
            'https://issuer.example'
        )
        await fillField(
            userEvent,
            canvas.getByRole('textbox', { name: /^Config URL/ }),
            'https://config.example'
        )

        // Hidden fields keep what was typed, and it isn't sent for other types
        await userEvent.selectOptions(type, 'self_signed')
        await userEvent.click(canvas.getByRole('button', { name: 'Add' }))
        await expect(args.onSave).toHaveBeenLastCalledWith({
            id: 'idp',
            type: 'self_signed',
            issuer: 'https://issuer.example',
        })

        await userEvent.selectOptions(type, 'oauth')
        await expect(
            canvas.getByRole('textbox', { name: /^Config URL/ })
        ).toHaveValue('https://config.example')
    },
}

export const RequiresFields: Story = {
    play: async ({ args, canvas, userEvent }) => {
        // The browser blocks submitting empty required fields
        await userEvent.click(canvas.getByRole('button', { name: 'Add' }))

        await expect(args.onSave).not.toHaveBeenCalled()
        await expect(canvas.getByRole('textbox', { name: /^ID/ })).toBeInvalid()
    },
}

export const ValidatesWhenBrowserValidationIsBypassed: Story = {
    play: async ({ args, canvas, canvasElement }) => {
        // e.g. a programmatic submit: the form checks the fields itself too
        canvasElement
            .querySelector('form')!
            .dispatchEvent(
                new Event('submit', { bubbles: true, cancelable: true })
            )

        await expect(await canvas.findByRole('alert')).toHaveTextContent(
            'Please fill in all required fields'
        )
        await expect(args.onSave).not.toHaveBeenCalled()
    },
}

export const Review: Story = {
    args: { idp: oauthIdp, onDelete: fn(), onCancel: fn() },
    play: async ({ args, canvas, userEvent }) => {
        // Prefilled with the identity provider
        await expect(canvas.getByRole('textbox', { name: /^ID/ })).toHaveValue(
            'my-idp'
        )
        await expect(
            canvas.getByRole('combobox', { name: /^Type/ })
        ).toHaveValue('oauth')
        await expect(
            canvas.queryByRole('button', { name: 'Add' })
        ).not.toBeInTheDocument()

        // Updating sends the edited values
        const issuer = canvas.getByRole('textbox', { name: /^Issuer URL/ })
        await fillField(userEvent, issuer, 'https://new-issuer.example')
        await userEvent.click(canvas.getByRole('button', { name: 'Update' }))
        await expect(args.onSave).toHaveBeenCalledWith({
            id: 'my-idp',
            type: 'oauth',
            issuer: 'https://new-issuer.example',
            configUrl: 'https://old-issuer.example/.well-known',
        })

        await userEvent.click(canvas.getByRole('button', { name: 'Cancel' }))
        await expect(args.onCancel).toHaveBeenCalledTimes(1)

        // Delete reports the identity provider as passed in, not the edited one
        await expect(
            canvas.getByRole('heading', { name: 'Delete identity provider' })
        ).toBeInTheDocument()
        await userEvent.click(
            canvas.getByRole('button', { name: 'Delete identity provider' })
        )
        await expect(args.onDelete).toHaveBeenCalledTimes(1)
        await expect(args.onDelete).toHaveBeenCalledWith(oauthIdp)
    },
}

export const ReviewSelfIssued: Story = {
    args: { idp: selfIssuedIdp },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('combobox', { name: /^Type/ })
        ).toHaveValue('self_issued')
        await expect(
            canvas.queryByRole('textbox', { name: /^Issuer URL/ })
        ).not.toBeInTheDocument()
    },
}

export const ReviewWithoutDeleteOrCancel: Story = {
    args: { idp: oauthIdp },
    play: async ({ canvas }) => {
        // Actions whose callback is omitted are hidden
        await expect(
            canvas.queryByRole('heading', { name: 'Delete identity provider' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Delete identity provider' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'Cancel' })
        ).not.toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Update' })
        ).toBeInTheDocument()
    },
}

export const Loading: Story = {
    args: { loading: true },
    play: async ({ canvas }) => {
        await expect(
            canvas.getByRole('textbox', { name: /^ID/ })
        ).toBeDisabled()
        await expect(
            canvas.getByRole('combobox', { name: /^Type/ })
        ).toBeDisabled()
        await expect(canvas.getByRole('button', { name: 'Add' })).toBeDisabled()
    },
}

export const StartsOverWhenIdpChanges: Story = {
    render: (args) => {
        const [idp, setIdp] = useState<Idp>(oauthIdp)
        return (
            <>
                <IdpForm idp={idp} onSave={args.onSave} />
                <Button onClick={() => setIdp(selfIssuedIdp)}>
                    Show other
                </Button>
            </>
        )
    },
    play: async ({ canvas, userEvent }) => {
        await userEvent.type(
            canvas.getByRole('textbox', { name: /^ID/ }),
            '-edited'
        )
        await expect(canvas.getByRole('textbox', { name: /^ID/ })).toHaveValue(
            'my-idp-edited'
        )

        await userEvent.click(
            canvas.getByRole('button', { name: 'Show other' })
        )

        await expect(canvas.getByRole('textbox', { name: /^ID/ })).toHaveValue(
            'self-issued-idp'
        )
        await expect(
            canvas.getByRole('combobox', { name: /^Type/ })
        ).toHaveValue('self_issued')
    },
}

export const ExposesE2eHooks: Story = {
    args: { idp: oauthIdp },
    play: async ({ canvasElement }) => {
        // The helpers in wallet-test-utils fill the form through these ids
        const tag = (id: string) =>
            canvasElement.querySelector(`#${id}`)?.tagName
        await expect(tag('idp-id')).toBe('INPUT')
        await expect(tag('idp-type')).toBe('SELECT')
        await expect(tag('idp-issuer')).toBe('INPUT')
        await expect(tag('idp-config-url')).toBe('INPUT')
    },
}
