// Copyright (c) 2025-2026 Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { html, css, nothing } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
    BaseElement,
    handleErrorToast,
} from '@canton-network/core-wallet-ui-components'
import { createUserClient } from '../rpc-client'
import { stateManager } from '../state-manager'
import '../index'
import {
    parsePreparedTransaction,
    PreparedTransactionParsed,
} from '../transactions/decode'

@customElement('user-ui-approve')
export class ApproveUi extends BaseElement {
    @state() accessor loading = false
    @state() accessor commandId = ''
    @state() accessor partyId = ''
    @state() accessor txHash = ''
    @state() accessor tx = ''
    @state() accessor txParsed: PreparedTransactionParsed | null = null
    @state() accessor status = ''
    @state() accessor message: string | null = null
    @state() accessor messageType: 'info' | 'error' | null = null
    @state() accessor createdAt: string | null = null
    @state() accessor signedAt: string | null = null
    @state() accessor origin: string | null = null

    static styles = [
        BaseElement.styles,
        css`
            :host {
                display: block;
                max-width: 900px;
                margin: 0 auto;
            }
            .tx-box {
                background: var(--bs-tertiary-bg, rgba(0, 0, 0, 0.05));
                border-radius: var(--bs-border-radius);
                padding: 0.5rem;
                max-height: 150px;
                overflow-y: auto;
                overflow-x: auto;
                font-family: var(--bs-font-monospace);
                word-break: break-word;
            }
        `,
    ]

    connectedCallback(): void {
        super.connectedCallback()
        const url = new URL(window.location.href)
        this.commandId = url.searchParams.get('commandId') || ''
        this.updateState()
    }

    private async updateState() {
        const userClient = await createUserClient(
            stateManager.accessToken.get()
        )
        userClient
            .request({
                method: 'getTransaction',
                params: { commandId: this.commandId },
            })
            .then((result) => {
                this.txHash = result.preparedTransactionHash
                this.tx = result.preparedTransaction
                this.status = result.status
                this.createdAt = result.createdAt || null
                this.signedAt = result.signedAt || null
                this.origin = result.origin || null
                try {
                    this.txParsed = parsePreparedTransaction(this.tx)
                } catch (error) {
                    console.error('Error parsing prepared transaction:', error)
                    this.txParsed = null
                }
            })

        userClient
            .request({ method: 'listWallets', params: {} })
            .then((wallets) => {
                this.partyId =
                    wallets.find((w) => w.primary === true)?.partyId || ''
            })
    }

    private async handleExecute() {
        this.loading = true
        this.message = 'Executing transaction...'
        this.messageType = 'info'

        try {
            const userClient = await createUserClient(
                stateManager.accessToken.get()
            )
            const { signature, signedBy } = await userClient.request({
                method: 'sign',
                params: {
                    commandId: this.commandId,
                    partyId: this.partyId,
                    preparedTransactionHash: this.txHash,
                    preparedTransaction: this.tx,
                },
            })

            await userClient.request({
                method: 'execute',
                params: {
                    signature,
                    signedBy,
                    commandId: this.commandId,
                    partyId: this.partyId,
                },
            })

            this.message = 'Transaction executed successfully ✅'
            this.messageType = 'info'
            // This prevents folks from clicking approve twice
            this.status = 'executed'

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
            <div class="card mt-4 overflow-hidden">
                <div class="card-body text-break">
                    <h1 class="card-title h5">Pending Transaction Request</h1>

                    <h2 class="h6 mt-3">Transaction Details</h2>

                    <h3 class="h6 mt-3">Command Id</h3>
                    <p>${this.commandId}</p>

                    <h3 class="h6 mt-3">Status</h3>
                    <p>${this.status}</p>

                    ${this.createdAt
                        ? html`<h3 class="h6 mt-3">Created At</h3>
                              <p>${this.createdAt}</p>`
                        : nothing}
                    ${this.signedAt
                        ? html`<h3 class="h6 mt-3">Signed At</h3>
                              <p>${this.signedAt}</p>`
                        : nothing}
                    ${this.origin
                        ? html`<h3 class="h6 mt-3">Origin</h3>
                              <p>${this.origin}</p>`
                        : nothing}

                    <h3 class="h6 mt-3">Template</h3>
                    <p>
                        ${this.txParsed?.packageName || 'N/A'}:${this.txParsed
                            ?.moduleName || 'N/A'}:${this.txParsed
                            ?.entityName || 'N/A'}
                    </p>

                    <h3 class="h6 mt-3">Signatories</h3>
                    <ul>
                        ${this.txParsed?.signatories?.map(
                            (signatory) => html`<li>${signatory}</li>`
                        ) || html`<li>N/A</li>`}
                    </ul>

                    <h3 class="h6 mt-3">Stakeholders</h3>
                    <ul>
                        ${this.txParsed?.stakeholders?.map(
                            (stakeholder) => html`<li>${stakeholder}</li>`
                        ) || html`<li>N/A</li>`}
                    </ul>

                    <h3 class="h6 mt-3">Transaction Hash</h3>
                    <p>${this.txHash}</p>

                    <div
                        class="d-flex justify-content-between align-items-center gap-2 mt-3"
                    >
                        <h3 class="h6 mb-0">Base64 Transaction</h3>
                        <button
                            class="btn btn-sm btn-outline-secondary"
                            @click=${() => this._copyToClipboard(this.tx)}
                            title="Copy to clipboard"
                        >
                            Copy
                        </button>
                    </div>
                    <div class="tx-box">${this.tx}</div>

                    <div
                        class="d-flex justify-content-between align-items-center gap-2 mt-3"
                    >
                        <h3 class="h6 mb-0">Decoded Transaction</h3>
                        <button
                            class="btn btn-sm btn-outline-secondary"
                            @click=${() =>
                                this._copyToClipboard(
                                    this.txParsed?.jsonString || ''
                                )}
                            title="Copy to clipboard"
                        >
                            Copy
                        </button>
                    </div>
                    <div class="tx-box">
                        ${this.txParsed?.jsonString || 'N/A'}
                    </div>

                    ${this.status === 'executed'
                        ? nothing
                        : html`
                              <button
                                  class="btn btn-primary w-100 mt-3"
                                  ?disabled=${this.loading}
                                  @click=${this.handleExecute}
                              >
                                  ${this.loading ? 'Processing...' : 'Approve'}
                              </button>
                          `}
                    ${this.message
                        ? html`<div
                              class="alert ${this.messageType === 'error'
                                  ? 'alert-danger'
                                  : 'alert-success'} mt-3"
                          >
                              ${this.message}
                          </div>`
                        : null}
                </div>
            </div>
        `
    }

    private _copyToClipboard(text: string) {
        navigator.clipboard.writeText(text)
    }
}
