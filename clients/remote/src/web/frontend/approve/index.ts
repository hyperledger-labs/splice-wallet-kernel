import { html, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import 'core-wallet-ui-components'
import { userClient } from '../rpc-client'
import { ExecuteParams, SignParams } from 'core-wallet-user-rpc-client'

@customElement('user-ui-approve')
export class ApproveUi extends LitElement {
    @state()
    accessor loading = false

    @state()
    accessor commandId = ''

    @state()
    accessor partyId = ''

    @state()
    accessor txHash = ''

    @state()
    accessor tx = ''

    connectedCallback(): void {
        super.connectedCallback()
        const url = new URL(window.location.href)

        this.commandId = url.searchParams.get('commandId') || ''
        this.partyId = url.searchParams.get('partyId') || ''
        this.txHash = url.searchParams.get('txHash') || ''
        this.tx = url.searchParams.get('tx') || ''
    }

    private async handleExecute() {
        this.loading = true

        const signRequest: SignParams = {
            commandId: this.commandId,
            partyId: this.partyId,
            preparedTransactionHash: this.txHash,
            preparedTransaction: this.tx,
        }
        const { signature, signedBy } = await userClient.request(
            'sign',
            signRequest
        )

        const executeRequest: ExecuteParams = {
            signature,
            signedBy,
            commandId: this.commandId,
            partyId: this.partyId,
        }
        await userClient.request('execute', executeRequest)

        if (window.opener) {
            // If this is a popup, close itself after execution
            window.close()
        }
    }

    protected render() {
        return html`
            <h1>Pending Transaction Request</h1>
            <div>
                <h2>Transaction</h2>
                <p>Command Id: ${this.commandId}</p>
            </div>
            <button ?disabled=${this.loading} @click=${this.handleExecute}>
                Approve
            </button>
        `
    }
}
