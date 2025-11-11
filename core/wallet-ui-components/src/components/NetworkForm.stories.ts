// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/web-components-vite'
import { html } from 'lit'

import { Network } from '@canton-network/core-wallet-store'
import { NetworkEditSaveEvent } from './NetworkForm'

const meta: Meta = {
    title: 'NetworkForm',
}

export default meta

function onSaved(e: NetworkEditSaveEvent) {
    console.log('saved!', { network: e.network })
    document.getElementById('output')!.textContent = 'saved successfully!'
}

export const Default: StoryObj = {
    render: () => {
        return html`<network-form @network-edit-save=${onSaved}></network-form>
            <div id="output"></div>`
    },
}

const sampleNetworkAuthorizationCode: Network = {
    name: 'Local (password IDP)',
    id: 'canton:local-password',
    synchronizerId:
        'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd',
    description: 'Unimplemented Password Auth',
    identityProviderId: 'idp1',
    ledgerApi: {
        baseUrl: 'https://test',
    },
    auth: {
        method: 'authorization_code',
        audience:
            'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
        scope: 'openid daml_ledger_api offline_access',
        clientId: 'wk-service-account',
    },
    adminAuth: {
        method: 'client_credentials',
        clientId: 'participant_admin',
        clientSecret: 'admin-client-secret',
        scope: 'daml_ledger_api',
        audience:
            'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
    },
}

export const PopulatedAuthorizationCode: StoryObj = {
    render: () => {
        return html`<network-form
                @network-edit-save=${onSaved}
                .network=${sampleNetworkAuthorizationCode}
            ></network-form>
            <div id="output"></div>`
    },
}

const sampleNetworkSelfSigned: Network = {
    name: 'Local (password IDP)',
    id: 'canton:local-password',
    synchronizerId:
        'wallet::1220e7b23ea52eb5c672fb0b1cdbc916922ffed3dd7676c223a605664315e2d43edd',
    description: 'Unimplemented Password Auth',
    identityProviderId: 'idp2',
    ledgerApi: {
        baseUrl: 'https://test',
    },
    auth: {
        method: 'self_signed',
        issuer: 'unsafe-issuer',
        audience:
            'https://daml.com/jwt/aud/participant/participant1::1220d44fc1c3ba0b5bdf7b956ee71bc94ebe2d23258dc268fdf0824fbaeff2c61424',
        scope: 'openid daml_ledger_api offline_access',
        clientId: 'wk-service-account',
        clientSecret: 'unsafe',
    },
}

export const PopulatedSelfSigned: StoryObj = {
    render: () => {
        return html`<network-form
                @network-edit-save=${onSaved}
                .network=${sampleNetworkSelfSigned}
            ></network-form>
            <div id="output"></div>`
    },
}
