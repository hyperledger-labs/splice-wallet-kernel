// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import '@canton-network/core-wallet-ui-components'
import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    Auth as ApiAuth,
    Network,
    RemoveNetworkParams,
} from '@canton-network/core-wallet-user-rpc-client'

import '../index'
import '/index.css'
import { stateManager } from '../state-manager'
import { createUserClient } from '../rpc-client'
import { handleErrorToast } from '../handle-errors'
import {
    NetworkCardDeleteEvent,
    NetworkEditSaveEvent,
} from '@canton-network/core-wallet-ui-components'
import { Auth } from '@canton-network/core-wallet-auth'

@customElement('user-ui-settings-networks')
export class UserUiSettingsNetworks extends LitElement {
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
            max-height: 75vh;
            overflow-y: scroll;
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
    @state() accessor isModalOpen = false
    @state() accessor editingNetwork: Network | null = null
    @state() accessor authType: string =
        this.editingNetwork?.auth?.method ?? 'authorization_code'

    private async listNetworks() {
        const userClient = createUserClient(stateManager.accessToken.get())
        const response = await userClient.request('listNetworks')
        this.networks = response.networks
    }

    connectedCallback(): void {
        super.connectedCallback()
        this.listNetworks()
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

    private async handleDelete(e: NetworkCardDeleteEvent) {
        if (!confirm(`Delete network "${e.network.name}"?`)) return
        try {
            const params: RemoveNetworkParams = {
                networkName: e.network.id,
            }
            const userClient = createUserClient(stateManager.accessToken.get())
            await userClient.request('removeNetwork', params)
            await this.listNetworks()
        } catch (e) {
            handleErrorToast(e)
        }
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

    private handleSubmit = async (e: NetworkEditSaveEvent) => {
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
            ...e.network,
            ledgerApi: e.network.ledgerApi.baseUrl,
            auth,
            adminAuth,
        }

        try {
            const userClient = createUserClient(stateManager.accessToken.get())
            await userClient.request('addNetwork', { network })
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
                @network-edit-save=${this.handleSubmit}
                @delete=${this.handleDelete}
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
                                  @network-edit-save=${this.handleSubmit}
                                  @network-edit-cancel=${this.closeModal}
                              ></network-form>
                          </div>
                      </div>
                  `
                : ''}
        `
    }
}
