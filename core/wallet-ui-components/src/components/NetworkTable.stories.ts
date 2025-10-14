// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'
import { Network } from '@canton-network/core-wallet-store'

const meta: Meta = {
    title: 'NetworkTable',
}

export default meta

const networks: Network[] = [
    {
        name: 'Local (password IDP)',
        chainId: 'canton:local-password',
        synchronizerId:
            'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd',
        description: 'Unimplemented Password Auth',
        ledgerApi: {
            baseUrl: 'https://test',
        },
        auth: {
            identityProviderId: 'idp1',
            type: 'password',
            issuer: 'http://127.0.0.1:8889',
            configUrl: 'http://127.0.0.1:8889/.well-known/openid-configuration',
            audience:
                'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
            tokenUrl: 'tokenUrl',
            grantType: 'password',
            scope: 'openid',
            clientId: 'wk-service-account',
            admin: {
                clientId: 'participant_admin',
                clientSecret: 'admin-client-secret',
            },
        },
    },
]

export const Default: StoryObj = {
    render: () => html`<network-table .networks=${networks}></network-table>`,
}

export const Multiple: StoryObj = {
    render: () =>
        html`<network-table
            .networks=${[
                ...networks,
                ...networks,
                ...networks,
                ...networks,
                ...networks,
            ]}
        ></network-table>`,
}
