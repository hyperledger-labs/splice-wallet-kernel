// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import { Network } from '@canton-network/core-wallet-store'

const meta: Meta = {
    title: 'NetworkForm',
}

export default meta

function onSaved() {
    document.getElementById('output')!.textContent = 'saved successfully!'
}

export const Default: StoryObj = {
    render: () => {
        return html`<network-form @network-edit-save=${onSaved}></network-form>
            <div id="output"></div>`
    },
}

const sampleNetworkImplicit: Network = {
    name: 'Local (OAuth IDP)',
    chainId: 'canton:local-oauth',
    synchronizerId:
        'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd',
    description: 'Mock OAuth IDP',
    ledgerApi: {
        baseUrl: 'http://127.0.0.1:5003',
    },
    auth: {
        identityProviderId: 'idp2',
        type: 'implicit',
        issuer: 'http://127.0.0.1:8889',
        configUrl: 'http://127.0.0.1:8889/.well-known/openid-configuration',
        audience:
            'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
        scope: 'openid daml_ledger_api offline_access',
        clientId: 'operator',
        admin: {
            clientId: 'participant_admin',
            clientSecret: 'admin-client-secret',
        },
    },
}

export const PopulatedImplicitAuth: StoryObj = {
    render: () => {
        return html`<network-form
                @network-edit-save=${onSaved}
                .network=${sampleNetworkImplicit}
            ></network-form>
            <div id="output"></div>`
    },
}

const sampleNetworkPassword: Network = {
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
}

export const PopulatedPasswordAuth: StoryObj = {
    render: () => {
        return html`<network-form
                @network-edit-save=${onSaved}
                .network=${sampleNetworkPassword}
            ></network-form>
            <div id="output"></div>`
    },
}
