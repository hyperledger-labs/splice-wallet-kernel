import { Auth, NetworkConfig } from 'core-wallet-store'
import { LitElement, html, css } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { userClient } from '../rpc-client'
import {
    AddNetworkParams,
    Network,
    RemoveNetworkParams,
} from 'core-wallet-user-rpc-client'
import 'core-wallet-ui-components'

@customElement('user-ui-networks')
export class UserUiNetworks extends LitElement {
    @state()
    accessor networks: NetworkConfig[] = []

    @state()
    accessor isModalOpen = false

    @state() accessor editingNetwork: NetworkConfig | null = null

    @state() accessor authType: string =
        this.editingNetwork?.auth?.type ?? 'implicit'

    private async listNetworks() {
        const response = await userClient.request('listNetworks')
        this.networks = response.networks as NetworkConfig[]
        console.log(JSON.stringify(this.networks))
    }

    static styles = css`
        div {
            background-color: var(--splice-wk-background-color, none);
            color: var(--splice-wk-text-color, black);
            font-family: var(--splice-wk-font-family);
        }
        header {
            display: flex;
            align-items: center;
            height: 100px;
        }

        :host {
            display: block;
            background-color: var(--splice-wk-background-color, none);
            color: var(--splice-wk-text-color, black);
            font-family: var(--splice-wk-font-family);
        }

        .table-wrapper {
            max-height: 300px;
            overflow-y: auto;
            border: 1px solid var(--splice-wk-border-color, #ccc);
            border-radius: 4px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        thead th {
            position: sticky;
            top: 0;
            z-index: 1;
            text-align: left;
            padding: 8px 12px;
            border-bottom: 1px solid var(--splice-wk-border-color, #ccc);
        }

        tbody td {
            padding: 8px 12px;
            border-bottom: 1px solid var(--splice-wk-border-color, #ccc);
        }

        tr:nth-child(even) {
            background-color: var(--splice-wk-background-color, none);
        }

        .actions button {
            margin-right: 4px;
            font-size: 0.8rem;
            padding: 4px 8px;
        }

        .modal {
            position: fixed;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .modal-content {
            background: var(--splice-wk-background-color, none);
            padding: 1.5rem;
            border-radius: 8px;
            width: 400px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
        }

        .form {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        input,
        select {
            padding: 6px;
            font-size: 1rem;
        }

        .buttons {
            display: flex;
            justify-content: flex-end;
            margin-top: 1rem;
            gap: 0.5rem;
            margin-bottom: 1.5rem;
        }
    `

    connectedCallback(): void {
        super.connectedCallback()
        this.listNetworks()
    }

    openAddModal = () => {
        this.isModalOpen = true
        this.editingNetwork = null
        console.log('opened')
    }

    closeModal = () => {
        this.isModalOpen = false
        this.listNetworks()
    }

    private async handleDelete(net: NetworkConfig) {
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
                domain: formData.get('domain') as string,
                audience: formData.get('audience') as string,
                scope: formData.get('scope') as string,
                clientId: formData.get('clientId') as string,
            }
        } else {
            auth = {
                type: 'password',
                tokenUrl: formData.get('tokenUrl') as string,
                grantType: formData.get('grantType') as string,
                scope: formData.get('scope') as string,
                clientId: formData.get('clientId') as string,
            }
        }

        const networkParam: Network = {
            networkId: formData.get('networkId') as string,
            name: formData.get('name') as string,
            description: formData.get('description') as string,
        }

        const p: AddNetworkParams = {
            network: networkParam,
            auth: auth,
            ledgerApiUrl: formData.get('ledgerApi.baseurl') as string,
        }

        console.log('add network params. ' + JSON.stringify(p))

        const result = await userClient.transport.submit({
            method: 'addNetwork',
            params: {
                network: networkParam,
                auth: auth,
                ledgerApiUrl: formData.get('ledgerApi.baseurl') as string,
            },
        })

        await this.listNetworks()
        console.log(result)
        this.closeModal()
    }

    onAuthTypeChange(e: Event) {
        const select = e.target as HTMLSelectElement
        this.authType = select.value
    }

    private getAuthField(field: string): string {
        if (!this.editingNetwork) return ''
        const auth = this.editingNetwork.auth
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (auth as any)?.[field] ?? ''
    }

    protected render() {
        return html`
            <div class="header"><h1>Networks</h1></div>
            <button class="buttons" @click=${this.openAddModal}>
                Add Network
            </button>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>ID</th>
                            <th>Description</th>
                            <th>Auth type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.networks.map(
                            (net) => html`
                                <tr>
                                    <td>${net.name}</td>
                                    <td>${net.networkId}</td>
                                    <td>${net.description}</td>
                                    <td>${net.auth.type}</td>
                                    <td class="actions">
                                        <button>Update</button>
                                        <button
                                            @click=${() =>
                                                this.handleDelete(net)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            `
                        )}
                    </tbody>
                </table>
            </div>

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
