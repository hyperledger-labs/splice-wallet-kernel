// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0
import { html, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import '@canton-network/core-wallet-ui-components'
import { userClient } from '../rpc-client'
import {
    ExecuteParams,
    SignParams,
} from '@canton-network/core-wallet-user-rpc-client'
import { decodePreparedTransaction } from '@canton-network/core-tx-visualizer'

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

    private decode(tx: string) {
        const t = decodePreparedTransaction(tx)

        return JSON.stringify(t, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )
    }

    connectedCallback(): void {
        super.connectedCallback()
        const url = new URL(window.location.href)

        this.commandId = url.searchParams.get('commandId') || ''
        this.partyId = url.searchParams.get('partyId') || ''
        this.txHash = decodeURIComponent(url.searchParams.get('txHash') || '')
        this.tx = decodeURIComponent(url.searchParams.get('tx') || '')
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
                <h3>Base64 encoded transaction</h3>
                <p>${this.tx}</p>
                <h3>Decoded Transaction</h3>
                <p>${this.decode(this.tx)}</p>
                <h3>Transaction Hash</h3>
                <p>${this.txHash}</p>
                <p>Command Id: ${this.commandId}</p>
            </div>
            <button ?disabled=${this.loading} @click=${this.handleExecute}>
                Approve
            </button>
        `
    }
}
