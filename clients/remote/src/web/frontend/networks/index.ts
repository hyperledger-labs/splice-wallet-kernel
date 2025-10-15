// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import '@canton-network/core-wallet-ui-components'
import { Auth } from '@canton-network/core-wallet-store'
import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    Network,
    RemoveNetworkParams,
    Session,
} from '@canton-network/core-wallet-user-rpc-client'

import '/index.css'
import { stateManager } from '../state-manager'
import { createUserClient } from '../rpc-client'
import { handleErrorToast } from '../handle-errors'

@customElement('user-ui-networks')
export class UserUiNetworks extends LitElement {
    static styles = css`
        :host {
            display: block;
            box-sizing: border-box;
            padding: 0rem;
            max-width: 900px;
            margin: 0 auto;
            font-family: var(--wg-theme-font-family, Arial, sans-serif);
        }
        .header {
            margin-bottom: 1rem;
        }
        .table-container {
            display: grid;
            grid-template-columns: 1fr;
            width: 100%;
            overflow-x: auto;
            margin-bottom: 2rem;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            background: #fff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        th,
        td {
            padding: 0.75rem 0.5rem;
            border-bottom: 1px solid #eee;
            text-align: left;
            font-size: 1rem;
        }
        th {
            background: #f7f7f7;
            font-weight: 600;
        }
        .buttons {
            background: #0052cc;
            color: #fff;
            border: none;
            padding: 0.6rem 1.2rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 1rem;
            margin-bottom: 1rem;
            transition: background 0.2s;
        }
        .buttons:hover {
            background: #0065ff;
        }
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.25);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
        }
        .modal-content {
            background: #fff;
            padding: 2rem;
            border-radius: 8px;
            min-width: 300px;
            max-width: 95vw;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
        }
        @media (max-width: 600px) {
            .modal-content {
                padding: 1rem;
                min-width: unset;
            }
            table,
            th,
            td {
                font-size: 0.95rem;
            }
            .header h1 {
                font-size: 1.2rem;
            }
        }
        @media (max-width: 400px) {
            .modal-content {
                padding: 0.5rem;
            }
            .buttons {
                font-size: 0.9rem;
                padding: 0.5rem 1rem;
            }
        }
        button {
            padding: 0.4rem 0.8rem;
            font-size: 1rem;
            border-radius: 4px;
            border: 1px solid #ccc;
            background: #f5f5f5;
            cursor: pointer;
            transition: background 0.2s;
        }
        button:hover {
            background: #e2e6ea;
        }
        @media (max-width: 600px) {
            .card-list {
                grid-template-columns: 1fr;
            }
            .network-card {
                padding: 0.7rem;
            }
            button {
                font-size: 0.9rem;
                padding: 0.3rem 0.6rem;
            }
        }
        .info-box {
            background: #eaf4fb;
            color: #1769aa;
            border-radius: 6px;
            padding: 0.75rem 1rem;
            margin-bottom: 1rem;
            font-size: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
    `

    @state() accessor networks: Network[] = []
    @state() accessor sessions: Session[] = []
    @state() accessor isModalOpen = false
    @state() accessor editingNetwork: Network | null = null
    @state() accessor authType: string =
        this.editingNetwork?.auth?.type ?? 'implicit'

    private async listNetworks() {
        const userClient = createUserClient(stateManager.accessToken.get())
        const response = await userClient.request('listNetworks')
        this.networks = response.networks
    }

    private async listSessions() {
        const userClient = createUserClient(stateManager.accessToken.get())
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

    syncWallets = async () => {
        try {
            const userClient = createUserClient(stateManager.accessToken.get())
            const result = await userClient.request('syncWallets')
            alert(
                `Wallet sync completed. Added ${result.added.length} wallets.`
            )
        } catch (e) {
            handleErrorToast(e)
        }
    }

    closeModal = () => {
        this.isModalOpen = false
        this.listNetworks()
    }

    private async handleDelete(net: Network) {
        if (!confirm(`Delete network "${net.name}"?`)) return

        try {
            const params: RemoveNetworkParams = { networkName: net.name }
            const userClient = createUserClient(stateManager.accessToken.get())
            await userClient.request('removeNetwork', params)
            await this.listNetworks()
        } catch (e) {
            handleErrorToast(e)
        }
    }

    handleSubmit = async (e: CustomEvent<FormData>) => {
        e.preventDefault()
        const formData = e.detail
        const authType = formData.get('authType') as string

        try {
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

            const userClient = createUserClient(stateManager.accessToken.get())
            await userClient.request('addNetwork', { network: networkParam })
            await this.listNetworks()
        } catch (e) {
            handleErrorToast(e)
        } finally {
            this.closeModal()
        }
    }

    onAuthTypeChange(e: Event) {
        const select = e.target as HTMLSelectElement
        this.authType = select.value
    }

    protected render() {
        return html`
            <div class="header"><h1>Sessions</h1></div>
            <div class="table-container">
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
                                    <td>
                                        <button
                                            type="button"
                                            @click=${() =>
                                                navigator.clipboard.writeText(
                                                    session.accessToken
                                                )}
                                            title="Copy access token"
                                        >
                                            Copy to clipboard
                                        </button>
                                    </td>
                                </tr>
                            `
                        )}
                    </tbody>
                </table>
            </div>

            <div class="header"><h1>Wallets</h1></div>
            <div class="info-box">
                <svg
                    width="20"
                    height="20"
                    fill="currentColor"
                    style="flex-shrink:0;"
                    viewBox="0 0 20 20"
                >
                    <circle cx="10" cy="10" r="10" fill="#1769aa" />
                    <text
                        x="10"
                        y="15"
                        text-anchor="middle"
                        fill="#fff"
                        font-size="14"
                        font-family="Arial"
                        font-weight="bold"
                    >
                        i
                    </text>
                </svg>
                <span
                    >Keep your wallets in sync with the connected network.</span
                >
            </div>
            <button class="buttons" @click=${this.syncWallets}>
                Sync Wallets
            </button>

            <div class="header"><h1>Networks</h1></div>
            <button class="buttons" @click=${this.openAddModal}>
                Add Network
            </button>

            <network-table
                .networks=${this.networks}
                @delete=${(e: CustomEvent) => this.handleDelete(e.detail)}
            ></network-table>

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
        `
    }
}
