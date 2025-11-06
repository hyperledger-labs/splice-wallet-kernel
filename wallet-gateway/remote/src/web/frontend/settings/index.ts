// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import '@canton-network/core-wallet-ui-components'
import { handleErrorToast } from '@canton-network/core-wallet-ui-components'

import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { Network, Session } from '@canton-network/core-wallet-user-rpc-client'

import '../index'
import '/index.css'
import { stateManager } from '../state-manager'
import { createUserClient } from '../rpc-client'

import './networks'

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
    @state() accessor isModalOpen = false
    @state() accessor editingNetwork: Network | null = null
    @state() accessor authType: string =
        this.editingNetwork?.auth?.method ?? 'authorization_code'

    // private async getClient() {
    // return createUserClient(stateManager.accessToken.get())
    // }

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

    // private async handleDelete(e: NetworkCardDeleteEvent) {
    //     if (!confirm(`Delete network "${e.network.name}"?`)) return
    //     try {
    //         const params: RemoveNetworkParams = {
    //             networkName: e.network.id,
    //         }
    //         const userClient = createUserClient(stateManager.accessToken.get())
    //         await userClient.request('removeNetwork', params)
    //         await this.listNetworks()
    //     } catch (e) {
    //         handleErrorToast(e)
    //     }
    // }

    // private toApiAuth(auth: Auth): ApiAuth {
    //     return {
    //         method: auth.method,
    //         audience: auth.audience ?? '',
    //         scope: auth.scope ?? '',
    //         clientId: auth.clientId ?? '',
    //         issuer: (auth as ApiAuth).issuer ?? '',
    //         clientSecret: (auth as ApiAuth).clientSecret ?? '',
    //     }
    // }

    // private handleSubmit = async (e: NetworkEditSaveEvent) => {
    //     e.preventDefault()

    //     const auth = this.toApiAuth(e.network.auth)
    //     const adminAuth = e.network.adminAuth
    //         ? this.toApiAuth(e.network.adminAuth)
    //         : {
    //               method: 'client_credentials',
    //               audience: '',
    //               scope: '',
    //               clientId: '',
    //               clientSecret: '',
    //           }

    //     const network: Network = {
    //         ...e.network,
    //         ledgerApi: e.network.ledgerApi.baseUrl,
    //         auth,
    //         adminAuth,
    //     }

    //     try {
    //         const userClient = createUserClient(stateManager.accessToken.get())
    //         await userClient.request('addNetwork', { network })
    //         await this.listNetworks()
    //     } catch (e) {
    //         handleErrorToast(e)
    //     } finally {
    //         this.closeModal()
    //     }
    // }

    onAuthTypeChange(e: Event) {
        const select = e.target as HTMLSelectElement
        this.authType = select.value
    }

    protected render() {
        const client = createUserClient(stateManager.accessToken.get())

        return html`
            <wg-sessions .sessions=${this.sessions}></wg-sessions>
            <wg-wallets .client=${client}></wg-wallets>
            <user-ui-settings-networks></user-ui-settings-networks>
        `
    }
}
