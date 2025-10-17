// Copyright (c) 2025 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css, LitElement } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import '@canton-network/core-wallet-ui-components'
import { createUserClient } from '../rpc-client'
import {
    ExecuteParams,
    SignParams,
} from '@canton-network/core-wallet-user-rpc-client'
import { decodePreparedTransaction } from '@canton-network/core-tx-visualizer'
import { stateManager } from '../state-manager'
import { handleErrorToast } from '../handle-errors'
import '../index'

@customElement('user-ui-approve')
export class ApproveUi extends LitElement {
    @state() accessor loading = false
    @state() accessor commandId = ''
    @state() accessor partyId = ''
    @state() accessor txHash = ''
    @state() accessor tx = ''
    @state() accessor message: string | null = null
    @state() accessor messageType: 'info' | 'error' | null = null

    static styles = css`
        :host {
            display: block;
            box-sizing: border-box;
            padding: 0rem;
            max-width: 900px;
            margin: 0 auto;
            font-family: var(--swk-font, Arial, sans-serif);
            color: var(--text-color, #222);
        }

        :host([theme='dark']) {
            --card-bg: #1e1e1e;
            --border-color: #333;
            --text-color: #fff;
            --button-bg: #4caf50;
            --button-hover: #66bb6a;
            --message-info: #81c784;
            --message-error: #ff6b6b;
        }

        :host(:not([theme='dark'])) {
            --card-bg: #fff;
            --border-color: #ddd;
            --text-color: #222;
            --button-bg: #4caf50;
            --button-hover: #43a047;
            --message-info: #388e3c;
            --message-error: #d32f2f;
        }

        .card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 1.5rem;
            width: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            overflow-x: hidden;
            word-break: break-word;
            margin-top: 2rem;
        }

        h1 {
            font-size: 1.25rem;
            margin: 0;
        }

        h2 {
            font-size: 1rem;
            margin: 0.5rem 0 0.25rem 0;
        }

        h3 {
            font-size: 0.875rem;
            margin: 0.25rem 0;
        }

        p {
            font-size: 0.85rem;
            margin: 0.25rem 0;
            word-break: break-word;
        }

        .tx-box {
            background: rgba(0, 0, 0, 0.05);
            border-radius: 8px;
            padding: 0.5rem;
            max-height: 150px;
            overflow-y: auto;
            overflow-x: auto;
            font-family: monospace;
            color: var(--text-color);
            word-break: break-word;
        }

        button {
            padding: 0.75rem;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            background: var(--button-bg);
            color: white;
            font-weight: 600;
            font-size: 1rem;
            transition: background 0.2s ease;
        }

        button:hover {
            background: var(--button-hover);
        }

        button[disabled] {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .message {
            padding: 0.5rem;
            border-radius: 6px;
            font-size: 0.875rem;
        }

        .message.info {
            background-color: var(--message-info);
            color: white;
        }

        .message.error {
            background-color: var(--message-error);
            color: white;
        }

        @media (max-width: 480px) {
            .card {
                padding: 1rem;
            }

            h1 {
                font-size: 1.1rem;
            }

            button {
                font-size: 0.95rem;
            }
        }
    `

    connectedCallback(): void {
        super.connectedCallback()
        const url = new URL(window.location.href)
        this.commandId = url.searchParams.get('commandId') || ''
        this.partyId = url.searchParams.get('partyId') || ''
        this.txHash = decodeURIComponent(url.searchParams.get('txHash') || '')
        this.tx = decodeURIComponent(url.searchParams.get('tx') || '')
    }

    private decode(tx: string) {
        const t = decodePreparedTransaction(tx)
        return JSON.stringify(
            t,
            (key, value) =>
                typeof value === 'bigint' ? value.toString() : value,
            2
        )
    }

    private async handleExecute() {
        this.loading = true
        this.message = 'Executing transaction...'
        this.messageType = 'info'

        try {
            const signRequest: SignParams = {
                commandId: this.commandId,
                partyId: this.partyId,
                preparedTransactionHash: this.txHash,
                preparedTransaction: this.tx,
            }

            const userClient = createUserClient(stateManager.accessToken.get())
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

            this.message = 'Transaction executed successfully ✅'
            this.messageType = 'info'

            if (window.opener) {
                setTimeout(() => window.close(), 1000)
            }
        } catch (err) {
            console.error(err)
            this.message = null
            this.messageType = null
            handleErrorToast(err, { message: 'Error executing transaction' })
        } finally {
            this.loading = false
        }
    }

    protected render() {
        return html`
            <div class="card">
                <h1>Pending Transaction Request</h1>

                <h2>Transaction Details</h2>

                <h3>Transaction Hash</h3>
                <p>${this.txHash}</p>

                <h3>Command Id</h3>
                <p>${this.commandId}</p>

                <h3>Base64 Transaction</h3>
                <div class="tx-box">${this.tx}</div>

                <h3>Decoded Transaction</h3>
                <div class="tx-box">${this.decode(this.tx)}</div>

                <button ?disabled=${this.loading} @click=${this.handleExecute}>
                    ${this.loading ? 'Processing...' : 'Approve'}
                </button>

                ${this.message
                    ? html`<div class="message ${this.messageType}">
                          ${this.message}
                      </div>`
                    : null}
            </div>
        `
    }
}
