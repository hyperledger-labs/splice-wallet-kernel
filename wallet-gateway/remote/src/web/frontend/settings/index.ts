// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import '@canton-network/core-wallet-ui-components'
import {
    BaseElement,
    handleErrorToast,
    IdpAddEvent,
    IdpCardDeleteEvent,
    NetworkCardDeleteEvent,
    NetworkEditSaveEvent,
} from '@canton-network/core-wallet-ui-components'

import { html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    Network,
    Session,
    Idp,
    Auth as ApiAuth,
} from '@canton-network/core-wallet-user-rpc-client'
import UserApiClient from '@canton-network/core-wallet-user-rpc-client'

import '../index'
import { stateManager } from '../state-manager'
import { createUserClient } from '../rpc-client'

import { Auth } from '@canton-network/core-wallet-auth'

@customElement('user-ui-settings')
export class UserUiSettings extends BaseElement {
    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                max-width: 900px;
                margin: 0 auto;
            }
        `,
    ]

    @state() accessor networks: Network[] = []
    @state() accessor sessions: Session[] = []
    @state() accessor idps: Idp[] = []
    @state() accessor client: UserApiClient | null = null
    @state() accessor gatewayVersion: string | undefined = undefined

    async connectedCallback(): Promise<void> {
        super.connectedCallback()
        this.client = await createUserClient(stateManager.accessToken.get())
        this.listNetworks()
        this.listSessions()
        this.listIdps()

        const version = await fetch('/.well-known/wallet-gateway-version')
            .then((res) => res.json())
            .then((data) => data.version)

        this.gatewayVersion = version ? `v${version}` : 'unknown_version'
    }

    private async listNetworks() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        const response = await userClient.request({ method: 'listNetworks' })
        this.networks = response.networks
    }

    private async listSessions() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        const response = await userClient.request({ method: 'listSessions' })
        this.sessions = response.sessions
    }

    private async listIdps() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        const response = await userClient.request({ method: 'listIdps' })
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

        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request({
                method: 'addNetwork',
                params: {
                    network: {
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
                    },
                },
            })
            await this.listNetworks()
        } catch (e) {
            handleErrorToast(e)
        }
    }

    private async handleNetworkDelete(e: NetworkCardDeleteEvent) {
        if (!confirm(`Delete network "${e.network.name}"?`)) return
        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            await userClient.request({
                method: 'removeNetwork',
                params: {
                    networkName: e.network.id,
                },
            })
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
            await userClient.request({
                method: 'addIdp',
                params: {
                    idp: ev.idp,
                },
            })
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
            await userClient.request({
                method: 'removeIdp',
                params: {
                    identityProviderId: ev.idp.id,
                },
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

        return html`
            <div>
                <h1>Wallet Gateway (${this.gatewayVersion})</h1>
            </div>
            <wg-sessions .sessions=${this.sessions}></wg-sessions>

            <wg-networks
                .networks=${this.networks}
                .activeSessions=${this.sessions}
                @network-edit-save=${this.handleNetworkSubmit}
                @delete=${this.handleNetworkDelete}
            ></wg-networks>
            <wg-idps
                .idps=${this.idps}
                .activeSessions=${this.sessions}
                @delete=${this.handleIdpDelete}
                @idp-add=${this.handleIdpSubmit}
            ></wg-idps>
        `
    }
}
