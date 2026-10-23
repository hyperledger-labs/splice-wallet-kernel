// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import type {
    OauthIdp,
    SelfIssuedIdp,
    SelfSignedIdp,
} from '@canton-network/core-wallet-user-rpc-client'
import { expect, fn } from 'storybook/test'
import { IdpCard } from './IdpCard'

const oauthIdp: OauthIdp = {
    id: 'my-idp',
    type: 'oauth',
    issuer: 'https://issuer.example',
    configUrl: 'https://issuer.example/.well-known/openid-configuration',
}

const selfSignedIdp: SelfSignedIdp = {
    id: 'self-signed-idp',
    type: 'self_signed',
    issuer: 'https://self-signed.example',
}

const selfIssuedIdp: SelfIssuedIdp = {
    id: 'self-issued-idp',
    type: 'self_issued',
}

const meta: Meta = {
    title: 'IdpCard',
    component: IdpCard,
    args: {
        idp: oauthIdp,
        onReview: fn(),
    },
}

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
    play: async ({ args, canvas, userEvent }) => {
        // Hook used by the e2e helpers in wallet-test-utils
        await expect(canvas.getByTestId('idp-card')).toBeInTheDocument()
        await expect(canvas.getByText('oauth')).toBeInTheDocument()
        await expect(canvas.getByText(oauthIdp.issuer)).toBeInTheDocument()
        await expect(canvas.getByText(oauthIdp.configUrl)).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Copy issuer URL' })
        ).toBeInTheDocument()
        await expect(
            canvas.getByRole('button', { name: 'Copy config URL' })
        ).toBeInTheDocument()

        await userEvent.click(canvas.getByRole('button', { name: 'my-idp' }))
        await expect(args.onReview).toHaveBeenCalledTimes(1)
        await expect(args.onReview).toHaveBeenCalledWith(oauthIdp)
    },
}

export const WholeCardIsClickable: Story = {
    play: async ({ canvas, canvasElement }) => {
        const card = canvas.getByRole('article')
        const reviewButton = canvas.getByRole('button', { name: 'my-idp' })
        const copyButton = canvas.getByRole('button', {
            name: 'Copy issuer URL',
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
        // ...but the copy buttons stay on top of it
        await expect(copyButton.contains(topElementAt(copyButton))).toBe(true)
    },
}

export const SelfSigned: Story = {
    args: { idp: selfSignedIdp },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('self_signed')).toBeInTheDocument()
        await expect(canvas.getByText(selfSignedIdp.issuer)).toBeInTheDocument()
        await expect(canvas.queryByText('Config URL')).not.toBeInTheDocument()
    },
}

export const SelfIssued: Story = {
    args: { idp: selfIssuedIdp },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('self_issued')).toBeInTheDocument()
        await expect(canvas.queryByText('Issuer')).not.toBeInTheDocument()
        await expect(canvas.queryByText('Config URL')).not.toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: /^Copy/ })
        ).not.toBeInTheDocument()
    },
}

export const ReadOnly: Story = {
    args: { onReview: undefined },
    play: async ({ canvas }) => {
        await expect(canvas.getByText('my-idp')).toBeInTheDocument()
        await expect(
            canvas.queryByRole('button', { name: 'my-idp' })
        ).not.toBeInTheDocument()
    },
}
