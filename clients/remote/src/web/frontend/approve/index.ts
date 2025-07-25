import { html, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import 'core-wallet-ui-components'
import { userClient } from '../rpc-client'
import { ExecuteParams } from 'core-wallet-user-rpc-client'

@customElement('user-ui-approve')
export class ApproveUi extends LitElement {
    @state()
    accessor loading = false

    @state()
    accessor commandId = ''

    connectedCallback(): void {
        super.connectedCallback()

        const url = new URL(window.location.href)
        this.commandId = url.searchParams.get('commandId') || ''
    }

    private async handleExecute() {
        this.loading = true

        const body: ExecuteParams = {
            commandId: this.commandId,

            // TODO: use results from the `sign` request
            partyId: '???',
            signature: '???',
            signedBy: '???',
        }

        await userClient.request('execute', body)

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
