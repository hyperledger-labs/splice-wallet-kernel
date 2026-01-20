// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Sessions } from '@canton-network/core-wallet-user-rpc-client'
import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

const meta: Meta = {
    title: 'Sessions',
}

export default meta

export const Default: StoryObj = {
    render: () => html`<wg-sessions></wg-sessions>`,
}

const mockSessions: Sessions = [
    {
        network: {
            name: 'Local (OAuth IDP)',
            id: 'canton:local-oauth',
            synchronizerId:
                'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd',
            identityProviderId: 'idp-mock-oauth',
            description: 'Mock OAuth IDP',
            ledgerApi: 'http://127.0.0.1:5003',
            auth: {
                method: 'authorization_code',
                audience: 'https://audience',
                scope: 'openid daml_ledger_api offline_access',
                clientId: 'operator',
            },
            adminAuth: {
                method: 'client_credentials',
                audience: 'https://audience',
                scope: 'daml_ledger_api',
                clientId: 'participant_admin',
                clientSecret: 'admin-client-secret',
            },
        },
        idp: {
            id: 'idp-mock-oauth',
            type: 'oauth',
            issuer: 'http://127.0.0.1:8889',
            configUrl: 'http://127.0.0.1:8889/.well-known/openid-configuration',
        },
        id: 'session-1234',
        accessToken: 'eyJra...ER7FGYA',
        status: 'connected',
    },
]

export const Populated: StoryObj = {
    render: () => html`<wg-sessions .sessions=${mockSessions}></wg-sessions>`,
}
