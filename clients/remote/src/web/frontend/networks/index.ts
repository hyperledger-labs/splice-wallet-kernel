// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import '@canton-network/core-wallet-ui-components'
import { Auth } from '@canton-network/core-wallet-store'
import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { userClient } from '../rpc-client'
import {
    Network,
    RemoveNetworkParams,
    Session,
} from '@canton-network/core-wallet-user-rpc-client'

import '../index'

@customElement('user-ui-networks')
export class UserUiNetworks extends LitElement {
    @state()
    accessor networks: Network[] = []

    @state()
    accessor sessions: Session[] = []

    @state()
    accessor isModalOpen = false

    @state() accessor editingNetwork: Network | null = null

    @state() accessor authType: string =
        this.editingNetwork?.auth?.type ?? 'implicit'

    private async listNetworks() {
        const response = await userClient.request('listNetworks')
        this.networks = response.networks
    }

    private async listSessions() {
        const response = await userClient.request('listSessions')
        this.sessions = response.sessions
    }

    connectedCallback(): void {
        super.connectedCallback()
        this.listNetworks()
        this.listSessions()
    }

    openAddModal = () => {
        this.isModalOpen = true
        this.editingNetwork = null
    }

    closeModal = () => {
        this.isModalOpen = false
        this.listNetworks()
    }

    private async handleDelete(net: Network) {
        if (!confirm(`delete network "${net.name}"?`)) return

        const params: RemoveNetworkParams = {
            networkName: net.name,
        }
        await userClient.request('removeNetwork', params)

        await this.listNetworks()
    }

    handleSubmit = async (e: CustomEvent<FormData>) => {
        e.preventDefault()
        const formData = e.detail

        const authType = formData.get('authType') as string

        let auth: Auth
        if (authType === 'implicit') {
            auth = {
                type: 'implicit',
                identityProviderId: formData.get(
                    'identityProviderId'
                ) as string,
                issuer: formData.get('issuer') as string,
                configUrl: formData.get('configUrl') as string,
                audience: formData.get('audience') as string,
                scope: formData.get('scope') as string,
                clientId: formData.get('clientId') as string,
            }
        } else {
            auth = {
                type: 'password',
                identityProviderId: formData.get(
                    'identityProviderId'
                ) as string,
                issuer: formData.get('issuer') as string,
                configUrl: formData.get('configUrl') as string,
                tokenUrl: formData.get('tokenUrl') as string,
                grantType: formData.get('grantType') as string,
                scope: formData.get('scope') as string,
                clientId: formData.get('clientId') as string,
                audience: formData.get('audience') as string,
            }
        }

        const networkParam: Network = {
            chainId: formData.get('chainId') as string,
            synchronizerId: formData.get('synchronizerId') as string,
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            auth: auth,
            ledgerApi: formData.get('ledgerApi.baseurl') as string,
        }

        await userClient.transport.submit({
            method: 'addNetwork',
            params: {
                network: networkParam,
            },
        })

        await this.listNetworks()

        this.closeModal()
    }

    onAuthTypeChange(e: Event) {
        const select = e.target as HTMLSelectElement
        this.authType = select.value
    }

    protected render() {
        return html`
            <user-ui-nav></user-ui-nav>

            <div class="header"><h1>Sessions</h1></div>
            <table>
                <thead>
                    <tr>
                        <th>Network ID</th>
                        <th>Status</th>
                        <th>AccessToken</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.sessions.map(
                        (session) => html`
                            <tr>
                                <td>${session.network.chainId}</td>
                                <td>${session.status}</td>
                                <td>${session.accessToken}</td>
                            </tr>
                        `
                    )}
                </tbody>
            </table>

            <div class="header"><h1>Networks</h1></div>
            <button class="buttons" @click=${this.openAddModal}>
                Add Network
            </button>

            <network-table
                .networks=${this.networks}
                @delete=${(e: CustomEvent) => this.handleDelete(e.detail)}
            >
            </network-table>

            <div>
                ${this.isModalOpen
                    ? html`
                          <div class="modal" @click=${this.closeModal}>
                              <div
                                  class="modal-content"
                                  @click=${(e: Event) => e.stopPropagation()}
                              >
                                  <h3>
                                      ${this.editingNetwork
                                          ? 'Edit Network'
                                          : 'Add Network'}
                                  </h3>
                                  <network-form
                                      .editingNetwork=${this.editingNetwork}
                                      .authType=${this.authType}
                                      @form-submit=${this.handleSubmit}
                                      @cancel=${this.closeModal}
                                  ></network-form>
                              </div>
                          </div>
                      `
                    : ''}
            </div>
        `
    }
}
