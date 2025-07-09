import 'core-wallet-ui-components'
import { Auth, NetworkConfig } from 'core-wallet-store'
import { LitElement, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { userClient } from '../rpc-client'
import { Network, RemoveNetworkParams } from 'core-wallet-user-rpc-client'

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
    }

    connectedCallback(): void {
        super.connectedCallback()
        this.listNetworks()
    }

    openAddModal = () => {
        this.isModalOpen = true
        this.editingNetwork = null
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

        await userClient.transport.submit({
            method: 'addNetwork',
            params: {
                network: networkParam,
                auth: auth,
                ledgerApiUrl: formData.get('ledgerApi.baseurl') as string,
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
