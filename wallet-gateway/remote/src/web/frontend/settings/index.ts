// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import '@canton-network/core-wallet-ui-components'
import {
    handleErrorToast,
    IdpAddEvent,
    IdpCardDeleteEvent,
    NetworkCardDeleteEvent,
    NetworkEditSaveEvent,
} from '@canton-network/core-wallet-ui-components'

import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    Network,
    RemoveNetworkParams,
    Session,
    Idp,
    Auth as ApiAuth,
} from '@canton-network/core-wallet-user-rpc-client'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'

import '../index'
import '/index.css'
import { stateManager } from '../state-manager'
import { createUserClient } from '../rpc-client'

import { Auth } from '@canton-network/core-wallet-auth'

@customElement('user-ui-settings')
export class UserUiSettings extends LitElement {
    static styles = css`
        :host {
            display: block;
            box-sizing: border-box;
            padding: 0rem;
            max-width: 900px;
            margin: 0 auto;
            font-family: var(--wg-theme-font-family, Arial, sans-serif);
        }
    `

    @state() accessor networks: Network[] = []
    @state() accessor sessions: Session[] = []
    @state() accessor idps: Idp[] = []
    @state() accessor client: UserApiClient | null = null

    async connectedCallback(): Promise<void> {
        super.connectedCallback()
        this.client = await createUserClient(stateManager.accessToken.get())
        this.listNetworks()
        this.listSessions()
        this.listIdps()
    }

    private async listNetworks() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        const response = await userClient.request('listNetworks')
        this.networks = response.networks
    }

    private async listSessions() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        const response = await userClient.request('listSessions')
        this.sessions = response.sessions
    }

    private async listIdps() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        const response = await userClient.request('listIdps')
        this.idps = response.idps
    }

    private toApiAuth(auth: Auth): ApiAuth {
        return {
            method: auth.method,
            audience: auth.audience ?? '',
            scope: auth.scope ?? '',
            clientId: auth.clientId ?? '',
            issuer: (auth as ApiAuth).issuer ?? '',
            clientSecret: (auth as ApiAuth).clientSecret ?? '',
        }
    }

    private handleNetworkSubmit = async (e: NetworkEditSaveEvent) => {
        e.preventDefault()

        const auth = this.toApiAuth(e.network.auth)
        const adminAuth = e.network.adminAuth
            ? this.toApiAuth(e.network.adminAuth)
            : {
                  method: 'client_credentials',
                  audience: '',
                  scope: '',
                  clientId: '',
                  clientSecret: '',
              }

        const network: Network = {
            id: e.network.id,
            name: e.network.name,
            description: e.network.description,
            identityProviderId: e.network.identityProviderId,
            ...(e.network.synchronizerId && {
                synchronizerId: e.network.synchronizerId as string,
            }),
            ledgerApi: e.network.ledgerApi.baseUrl,
            auth,
            adminAuth,
        }

        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request('addNetwork', { network })
            await this.listNetworks()
        } catch (e) {
            handleErrorToast(e)
        }
    }

    private async handleNetworkDelete(e: NetworkCardDeleteEvent) {
        if (!confirm(`Delete network "${e.network.name}"?`)) return
        try {
            const params: RemoveNetworkParams = {
                networkName: e.network.id,
            }
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request('removeNetwork', params)
            await this.listNetworks()
        } catch (e) {
            handleErrorToast(e)
        }
    }

    private handleIdpSubmit = async (ev: IdpAddEvent) => {
        console.log(ev)
        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request('addIdp', { idp: ev.idp })
            await this.listIdps()
        } catch (e) {
            handleErrorToast(e)
        }
    }

    private handleIdpDelete = async (ev: IdpCardDeleteEvent) => {
        console.log(ev)
        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request('removeIdp', {
                identityProviderId: ev.idp.id,
            })
            await this.listIdps()
        } catch (e) {
            handleErrorToast(e)
        }
    }

    protected render() {
        if (!this.client) {
            return html``
        }
        const client = this.client

        return html`
            <wg-sessions .sessions=${this.sessions}></wg-sessions>

            <wg-wallets-sync .client=${client}></wg-wallets-sync>

            <wg-networks
                .networks=${this.networks}
                @network-edit-save=${this.handleNetworkSubmit}
                @delete=${this.handleNetworkDelete}
            ></wg-networks>

            <wg-idps
                .idps=${this.idps}
                @delete=${this.handleIdpDelete}
                @idp-add=${this.handleIdpSubmit}
            ></wg-idps>
        `
    }
}
